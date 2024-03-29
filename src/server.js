// NOTE: the import for tracer doesn't resolve with path aliasing
import "./utils/tracer"
import "module-alias/register"

import { SgidClient } from "@opengovsg/sgid-client"
import SequelizeStoreFactory from "connect-session-sequelize"
import session from "express-session"
import { result } from "lodash"
import nocache from "nocache"
import simpleGit from "simple-git"

import { config } from "@config/config"

import logger from "@logger/logger"

import { MAX_CONCURRENT_GIT_PROCESSES } from "@constants/constants"

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
  ReviewComment,
  Reviewer,
  ReviewRequestView,
} from "@database/models"
import bootstrap from "@root/bootstrap"
import {
  getAuthenticationMiddleware,
  getAuthorizationMiddleware,
  featureFlagMiddleware,
} from "@root/middleware"
import { statsMiddleware } from "@root/middleware/stats"
import { BaseDirectoryService } from "@root/services/directoryServices/BaseDirectoryService"
import { CollectionPageService } from "@root/services/fileServices/MdPageServices/CollectionPageService"
import { ContactUsPageService } from "@root/services/fileServices/MdPageServices/ContactUsPageService"
import { HomepagePageService } from "@root/services/fileServices/MdPageServices/HomepagePageService"
import { ResourcePageService } from "@root/services/fileServices/MdPageServices/ResourcePageService"
import { SubcollectionPageService } from "@root/services/fileServices/MdPageServices/SubcollectionPageService"
import { UnlinkedPageService } from "@root/services/fileServices/MdPageServices/UnlinkedPageService"
import { CollectionYmlService } from "@root/services/fileServices/YmlFileServices/CollectionYmlService"
import { FooterYmlService } from "@root/services/fileServices/YmlFileServices/FooterYmlService"
import DynamoDBService from "@root/services/infra/DynamoDBService"
import { isomerRepoAxiosInstance } from "@services/api/AxiosInstance"
import { ResourceRoomDirectoryService } from "@services/directoryServices/ResourceRoomDirectoryService"
import { ConfigYmlService } from "@services/fileServices/YmlFileServices/ConfigYmlService"
import {
  getIdentityAuthService,
  getUsersService,
  isomerAdminsService,
  notificationsService,
} from "@services/identity"
import DeploymentsService from "@services/identity/DeploymentsService"
import PreviewService from "@services/identity/PreviewService"
import ReposService from "@services/identity/ReposService"
import { SitesCacheService } from "@services/identity/SitesCacheService"
import SitesService from "@services/identity/SitesService"
import InfraService from "@services/infra/InfraService"
import StepFunctionsService from "@services/infra/StepFunctionsService"
import ReviewRequestService from "@services/review/ReviewRequestService"
import { mailer } from "@services/utilServices/MailClient"

import { database } from "./database/config"
import { apiLogger } from "./middleware/apiLogger"
import { NotificationOnEditHandler } from "./middleware/notificationOnEditHandler"
import { FormsgSiteAuditLogsRouter } from "./routes/formsg/formsgSiteAuditLogs"
import getAuthenticatedSubrouter from "./routes/v2/authenticated"
import { ReviewsRouter } from "./routes/v2/authenticated/review"
import getAuthenticatedSitesSubrouter from "./routes/v2/authenticatedSites"
import { SgidAuthRouter } from "./routes/v2/sgidAuth"
import AuditLogsService from "./services/admin/AuditLogsService"
import RepoManagementService from "./services/admin/RepoManagementService"
import GitFileCommitService from "./services/db/GitFileCommitService"
import GitFileSystemService from "./services/db/GitFileSystemService"
import RepoService from "./services/db/RepoService"
import { PageService } from "./services/fileServices/MdPageServices/PageService"
import { ConfigService } from "./services/fileServices/YmlFileServices/ConfigService"
import CollaboratorsService from "./services/identity/CollaboratorsService"
import LaunchClient from "./services/identity/LaunchClient"
import LaunchesService from "./services/identity/LaunchesService"
import DynamoDBDocClient from "./services/infra/DynamoDBClient"
import RepoCheckerService from "./services/review/RepoCheckerService"
import ReviewCommentService from "./services/review/ReviewCommentService"
import { rateLimiter } from "./services/utilServices/RateLimiter"
import SgidAuthService from "./services/utilServices/SgidAuthService"
import { isSecure } from "./utils/auth-utils"
import { setBrowserPolyfills } from "./utils/growthbook-utils"

const path = require("path")

const AUTH_TOKEN_EXPIRY_MS = config.get("auth.tokenExpiryInMs")

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
  ReviewComment,
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

const SESSION_SECRET = config.get("auth.sessionSecret")

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

const { AuthRouter } = require("@routes/v2/auth")

const { FormsgGGsRepairRouter } = require("@root/routes/formsg/formsgGGsRepair")
const {
  FormsgSiteCheckerRouter,
} = require("@root/routes/formsg/formsgSiteChecker")
const {
  FormsgSiteCreateRouter,
} = require("@root/routes/formsg/formsgSiteCreation")
const {
  FormsgSiteLaunchRouter,
} = require("@root/routes/formsg/formsgSiteLaunch")
const { AuthService } = require("@services/utilServices/AuthService")

// growthbook polyfills
setBrowserPolyfills()

const authService = new AuthService({ usersService })
const simpleGitInstance = new simpleGit({
  maxConcurrentProcesses: MAX_CONCURRENT_GIT_PROCESSES,
})

const gitFileSystemService = new GitFileSystemService(simpleGitInstance)
const gitFileCommitService = new GitFileCommitService(gitFileSystemService)

const gitHubService = new RepoService({
  isomerRepoAxiosInstance,
  gitFileSystemService,
  gitFileCommitService,
})

const repoManagementService = new RepoManagementService({
  repoService: gitHubService,
})
const configYmlService = new ConfigYmlService({ gitHubService })
const footerYmlService = new FooterYmlService({ gitHubService })
const collectionYmlService = new CollectionYmlService({ gitHubService })
const baseDirectoryService = new BaseDirectoryService({
  repoService: gitHubService,
})

const contactUsService = new ContactUsPageService({
  gitHubService,
  footerYmlService,
})
const collectionPageService = new CollectionPageService({
  gitHubService,
  collectionYmlService,
})
const subCollectionPageService = new SubcollectionPageService({
  gitHubService,
  collectionYmlService,
})
const homepageService = new HomepagePageService({ gitHubService })
const resourcePageService = new ResourcePageService({ gitHubService })
const unlinkedPageService = new UnlinkedPageService({ gitHubService })
const resourceRoomDirectoryService = new ResourceRoomDirectoryService({
  baseDirectoryService,
  configYmlService,
  gitHubService,
})
const pageService = new PageService({
  collectionPageService,
  contactUsService,
  subCollectionPageService,
  homepageService,
  resourcePageService,
  unlinkedPageService,
  resourceRoomDirectoryService,
})
const reviewCommentService = new ReviewCommentService(ReviewComment)
const reviewRequestService = new ReviewRequestService(
  gitHubService,
  reviewCommentService,
  mailer,
  User,
  ReviewRequest,
  Reviewer,
  ReviewMeta,
  ReviewRequestView,
  pageService,
  new ConfigService(),
  sequelize
)

const cacheRefreshInterval = 1000 * 60 * 5 // 5 minutes
const sitesCacheService = new SitesCacheService(cacheRefreshInterval)
const previewService = new PreviewService()
const deploymentsService = new DeploymentsService({
  deploymentsRepository: Deployment,
})
const sitesService = new SitesService({
  siteRepository: Site,
  gitHubService,
  configYmlService,
  usersService,
  isomerAdminsService,
  reviewRequestService,
  sitesCacheService,
  previewService,
  deploymentsService,
})
const reposService = new ReposService({
  repository: Repo,
  simpleGit: simpleGitInstance,
})

const launchClient = new LaunchClient()
const launchesService = new LaunchesService({
  launchesRepository: Launch,
  repoRepository: Repo,
  deploymentRepository: Deployment,
  redirectionsRepository: Redirection,
  siteRepository: Site,
  launchClient,
})
const stepFunctionsService = new StepFunctionsService(
  config.get("aws.stepFunctions.stepFunctionsArn")
)
const dynamoDBService = new DynamoDBService({
  dynamoDBClient: new DynamoDBDocClient(),
})

const identityAuthService = getIdentityAuthService(gitHubService)
const collaboratorsService = new CollaboratorsService({
  siteRepository: Site,
  siteMemberRepository: SiteMember,
  isomerAdminsService,
  sitesService,
  usersService,
  whitelist: Whitelist,
})

const sgidClient = new SgidClient({
  clientId: config.get("sgid.clientId"),
  clientSecret: config.get("sgid.clientSecret"),
  redirectUri: config.get("sgid.redirectUri"),
  privateKey: config.get("sgid.privateKey"),
})
const sgidAuthService = new SgidAuthService({
  sgidClient,
})

const infraService = new InfraService({
  sitesService,
  reposService,
  deploymentsService,
  launchesService,
  collaboratorsService,
  stepFunctionsService,
  dynamoDBService,
  usersService,
})

const repoCheckerService = new RepoCheckerService({
  siteMemberRepository: SiteMember,
  gitFileSystemService,
  repoRepository: Repo,
  git: simpleGitInstance,
  pageService,
})

const auditLogsService = new AuditLogsService({
  collaboratorsService,
  isomerAdminsService,
  notificationsService,
  reviewRequestService,
  sitesService,
  usersService,
})

// poller site launch updates
infraService.pollMessages()

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
  notificationsService,
  gitHubService
)

const authenticatedSubrouterV2 = getAuthenticatedSubrouter({
  authenticationMiddleware,
  sitesService,
  usersService,
  reposService,
  statsMiddleware,
  deploymentsService,
  apiLogger,
  collaboratorsService,
  authorizationMiddleware,
  reviewRouter,
  notificationsService,
  infraService,
  repoCheckerService,
})

const authenticatedSitesSubrouterV2 = getAuthenticatedSitesSubrouter({
  authorizationMiddleware,
  authenticationMiddleware,
  gitHubService,
  configYmlService,
  apiLogger,
  notificationOnEditHandler,
  sitesService,
  deploymentsService,
  repoManagementService,
})
const sgidAuthRouter = new SgidAuthRouter({
  usersService,
  sgidAuthService,
})
const authV2Router = new AuthRouter({
  authenticationMiddleware,
  authService,
  apiLogger,
  rateLimiter,
  statsMiddleware,
  sgidAuthRouter,
})
const formsgSiteCreateRouter = new FormsgSiteCreateRouter({
  usersService,
  infraService,
  gitFileSystemService,
})
const formsgSiteLaunchRouter = new FormsgSiteLaunchRouter({
  usersService,
  infraService,
})

const formsgGGsRepairRouter = new FormsgGGsRepairRouter({
  gitFileSystemService,
  reposService,
})

const formsgSiteCheckerRouter = new FormsgSiteCheckerRouter({
  repoCheckerService,
})

const formsgSiteAuditLogsRouter = new FormsgSiteAuditLogsRouter({
  auditLogsService,
})

const app = express()

if (isSecure) {
  // Our server only receives requests from the alb reverse proxy, so we need to use the client IP provided in X-Forwarded-For
  // This is trusted because our security groups block all other access to the server
  app.set("trust proxy", true)
}
app.use(helmet())

// use growthbook across routes
app.use(featureFlagMiddleware)

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
app.use("/v2/auth", authV2Router.getRouter())
// Endpoints which have require login, but not site access token
app.use("/v2", authenticatedSubrouterV2)
// Endpoints which modify the github repo, used to inject site access token
app.use("/v2/sites/:siteName", authenticatedSitesSubrouterV2)

// FormSG Backend handler routes
app.use("/formsg", formsgSiteCreateRouter.getRouter())
app.use("/formsg", formsgSiteLaunchRouter.getRouter())
app.use("/formsg", formsgGGsRepairRouter.getRouter())
app.use("/formsg", formsgSiteCheckerRouter.getRouter())
app.use("/formsg", formsgSiteAuditLogsRouter.getRouter())

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
    ReviewComment.sync()
    bootstrap(app)
  })
  .catch((err) => {
    logger.error(`Unable to connect to the database: ${err}`)

    // If we cannot connect to the db, report an error using status code
    // And gracefully shut down the application since we can't serve client
    process.exitCode = 1
  })
