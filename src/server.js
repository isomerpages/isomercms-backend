import "dd-trace/init"
import "module-alias/register"

import logger from "@logger/logger"

import initSequelize from "@database/index"
import {
  Site,
  SiteMember,
  User,
  Whitelist,
  AccessToken,
  Repo,
  Deployment,
  Launch,
  Redirection,
  IsomerAdmin,
  Notification,
  ReviewRequest,
  ReviewMeta,
  Reviewer,
  ReviewRequestView,
} from "@database/models"
import bootstrap from "@root/bootstrap"
import {
  getAuthenticationMiddleware,
  getAuthorizationMiddleware,
} from "@root/middleware"
import { isomerRepoAxiosInstance } from "@services/api/AxiosInstance"
import {
  getIdentityAuthService,
  getUsersService,
  isomerAdminsService,
  notificationsService,
} from "@services/identity"
import DeploymentsService from "@services/identity/DeploymentsService"
import QueueService from "@services/identity/QueueService"
import ReposService from "@services/identity/ReposService"
import SitesService from "@services/identity/SitesService"
import InfraService from "@services/infra/InfraService"
import ReviewRequestService from "@services/review/ReviewRequestService"

import { apiLogger } from "./middleware/apiLogger"
import { AuthorizationMiddleware } from "./middleware/authorization"
import getAuthenticatedSubrouterV1 from "./routes/v1/authenticated"
import getAuthenticatedSitesSubrouterV1 from "./routes/v1/authenticatedSites"
import getAuthenticatedSubrouter from "./routes/v2/authenticated"
import { ReviewsRouter } from "./routes/v2/authenticated/review"
import getAuthenticatedSitesSubrouter from "./routes/v2/authenticatedSites"
import CollaboratorsService from "./services/identity/CollaboratorsService"
import LaunchClient from "./services/identity/LaunchClient"
import LaunchesService from "./services/identity/LaunchesService"

const path = require("path")

const sequelize = initSequelize([
  Site,
  SiteMember,
  User,
  Whitelist,
  AccessToken,
  Repo,
  Deployment,
  Launch,
  Redirection,
  IsomerAdmin,
  Notification,
  ReviewMeta,
  Reviewer,
  ReviewRequest,
  ReviewRequestView,
])
const usersService = getUsersService(sequelize)

const cookieParser = require("cookie-parser")
const cors = require("cors")
const express = require("express")
const helmet = require("helmet")
const createError = require("http-errors")

// Env vars
const { FRONTEND_URL } = process.env
// Import middleware

// Import routes
const { errorHandler } = require("@middleware/errorHandler")

const { FormsgRouter } = require("@routes/formsgSiteCreation")
const { FormsgSiteLaunchRouter } = require("@routes/formsgSiteLaunch")
const { AuthRouter } = require("@routes/v2/auth")

const { GitHubService } = require("@services/db/GitHubService")
const {
  ConfigYmlService,
} = require("@services/fileServices/YmlFileServices/ConfigYmlService")
const { AuthService } = require("@services/utilServices/AuthService")

const authService = new AuthService({ usersService })
const reposService = new ReposService({ repository: Repo })
const deploymentsService = new DeploymentsService({ repository: Deployment })
const launchClient = new LaunchClient()
const launchesService = new LaunchesService({
  launchesRepository: Launch,
  repoRepository: Repo,
  deploymentRepository: Deployment,
  redirectionsRepository: Redirection,
  launchClient,
})
const queueService = new QueueService()
const infraService = new InfraService({
  sitesService,
  reposService,
  deploymentsService,
  launchesService,
  queueService,
})

// poller for incoming queue
infraService.pollQueue()

const gitHubService = new GitHubService({
  axiosInstance: isomerRepoAxiosInstance,
})
const identityAuthService = getIdentityAuthService(gitHubService)

const configYmlService = new ConfigYmlService({ gitHubService })

const reviewRequestService = new ReviewRequestService(
  gitHubService,
  User,
  ReviewRequest,
  Reviewer,
  ReviewMeta,
  ReviewRequestView
)
const sitesService = new SitesService({
  siteRepository: Site,
  gitHubService,
  configYmlService,
  usersService,
  isomerAdminsService,
  reviewRequestService,
})
const collaboratorsService = new CollaboratorsService({
  siteRepository: Site,
  siteMemberRepository: SiteMember,
  sitesService,
  usersService,
  whitelist: Whitelist,
})

const authenticationMiddleware = getAuthenticationMiddleware()
const authorizationMiddleware = getAuthorizationMiddleware({
  identityAuthService,
  usersService,
  isomerAdminsService,
  collaboratorsService,
})

const reviewRouter = new ReviewsRouter(
  reviewRequestService,
  usersService,
  sitesService,
  collaboratorsService
)
const authenticatedSubrouterV1 = getAuthenticatedSubrouterV1({
  authenticationMiddleware,
  usersService,
  apiLogger,
})
const authenticatedSitesSubrouterV1 = getAuthenticatedSitesSubrouterV1({
  authenticationMiddleware,
  authorizationMiddleware,
  apiLogger,
})

const authenticatedSubrouterV2 = getAuthenticatedSubrouter({
  authenticationMiddleware,
  sitesService,
  usersService,
  reposService,
  deploymentsService,
  apiLogger,
  isomerAdminsService,
  collaboratorsService,
  authorizationMiddleware,
  reviewRouter,
})

const authenticatedSitesSubrouterV2 = getAuthenticatedSitesSubrouter({
  authorizationMiddleware,
  authenticationMiddleware,
  gitHubService,
  configYmlService,
  apiLogger,
  notificationsService,
})
const authV2Router = new AuthRouter({ authenticationMiddleware, authService, apiLogger })
const formsgRouter = new FormsgRouter({ usersService, infraService })
const formsgSiteLaunchRouter = new FormsgSiteLaunchRouter({
  usersService,
  infraService,
})

const app = express()
app.use(helmet())

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
)
app.use(express.json({ limit: "7mb" }))
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "public")))

// Health endpoint
app.use("/v2/ping", (req, res, next) => res.status(200).send("Ok"))

// Routes layer setup
// To avoid refactoring auth router v1 to use dependency injection
app.use("/v1/auth", authV2Router.getRouter())
// Endpoints which have siteName, used to inject site access token
app.use("/v1/sites/:siteName", authenticatedSitesSubrouterV1)
// Endpoints which require login, but not site access token
app.use("/v1", authenticatedSubrouterV1)

app.use("/v2/auth", authV2Router.getRouter())
// Endpoints which have siteName, used to inject site access token
app.use("/v2/sites/:siteName", authenticatedSitesSubrouterV2)
// Endpoints which have require login, but not site access token
app.use("/v2", authenticatedSubrouterV2)

// FormSG Backend handler routes
app.use("/formsg", formsgRouter.getRouter())
app.use("/formsg", formsgSiteLaunchRouter.getRouter())

// catch unknown routes
app.use((req, res, next) => {
  if (!req.route) {
    return res.status(404).send("Unknown route requested")
  }
  return next()
})

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// error handler
app.use(errorHandler)

logger.info("Connecting to Sequelize")
sequelize
  .authenticate()
  .then(() => {
    logger.info("Connection has been established successfully.")
    bootstrap(app)
  })
  .catch((err) => {
    logger.error(`Unable to connect to the database: ${err}`)

    // If we cannot connect to the db, report an error using status code
    // And gracefully shut down the application since we can't serve client
    process.exitCode = 1
  })
