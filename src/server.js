import "dd-trace/init"
import "module-alias/register"
import SequelizeStoreFactory from "connect-session-sequelize"
import session from "express-session"
import nocache from "nocache"

import { config } from "@config/config"

import logger from "@logger/logger"

import initSequelize from "@database/index"
import {
  Site,
  SiteMember,
  User,
  Whitelist,
  AccessToken,
  Repo,
  Otp,
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
import { NotificationOnEditHandler } from "./middleware/notificationOnEditHandler"
import getAuthenticatedSubrouterV1 from "./routes/v1/authenticated"
import getAuthenticatedSitesSubrouterV1 from "./routes/v1/authenticatedSites"
import getAuthenticatedSubrouter from "./routes/v2/authenticated"
import { ReviewsRouter } from "./routes/v2/authenticated/review"
import getAuthenticatedSitesSubrouter from "./routes/v2/authenticatedSites"
import CollaboratorsService from "./services/identity/CollaboratorsService"
import LaunchClient from "./services/identity/LaunchClient"
import LaunchesService from "./services/identity/LaunchesService"
import { rateLimiter } from "./services/utilServices/RateLimiter"

const path = require("path")

const AUTH_TOKEN_EXPIRY_MS = config.get("auth.tokenExpiry")

const sequelize = initSequelize([
  Site,
  SiteMember,
  User,
  Whitelist,
  AccessToken,
  Otp,
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

const NODE_ENV = config.get("env")
const SESSION_SECRET = config.get("auth.sessionSecret")

const isSecure =
  NODE_ENV !== "DEV" && NODE_ENV !== "LOCAL_DEV" && NODE_ENV !== "test"

const SequelizeStore = SequelizeStoreFactory(session.Store)
const sessionMiddleware = session({
  store: new SequelizeStore({
    db: sequelize,
    tableName: "sessions",
    checkExpirationInterval: 15 * 60 * 1000, // Checks expired sessions every 15 minutes
  }),
  resave: false, // can set to false since touch is implemented by our store
  saveUninitialized: false, // do not save new sessions that have not been modified
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: isSecure,
    maxAge: AUTH_TOKEN_EXPIRY_MS,
  },
  secret: SESSION_SECRET,
  name: "isomer",
})

// Env vars
const FRONTEND_URL = config.get("app.frontendUrl")
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
const gitHubService = new GitHubService({
  axiosInstance: isomerRepoAxiosInstance,
})
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

const identityAuthService = getIdentityAuthService(gitHubService)
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
const notificationOnEditHandler = new NotificationOnEditHandler({
  reviewRequestService,
  sitesService,
  collaboratorsService,
  notificationsService,
})

const reviewRouter = new ReviewsRouter(
  reviewRequestService,
  usersService,
  sitesService,
  collaboratorsService,
  notificationsService
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
  notificationsService,
})

const authenticatedSitesSubrouterV2 = getAuthenticatedSitesSubrouter({
  authorizationMiddleware,
  authenticationMiddleware,
  gitHubService,
  configYmlService,
  apiLogger,
  notificationsService,
  notificationOnEditHandler,
})
const authV2Router = new AuthRouter({
  authenticationMiddleware,
  authService,
  apiLogger,
  rateLimiter,
})
const formsgRouter = new FormsgRouter({ usersService, infraService })
const formsgSiteLaunchRouter = new FormsgSiteLaunchRouter({
  usersService,
  infraService,
})

const app = express()

if (isSecure) {
  // Our server only receives requests from the alb reverse proxy, so we need to use the client IP provided in X-Forwarded-For
  // This is trusted because our security groups block all other access to the server
  app.set("trust proxy", true)
}
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
app.use(nocache())

app.use(sessionMiddleware)

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
// Endpoints which have require login, but not site access token
app.use("/v2", authenticatedSubrouterV2)
// Endpoints which modify the github repo, used to inject site access token
app.use("/v2/sites/:siteName", authenticatedSitesSubrouterV2)

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
