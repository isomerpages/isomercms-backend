import "module-alias/register"

import logger from "@logger/logger"

import initSequelize from "@database/index"
import { Site, SiteMember, User, Whitelist } from "@database/models"
import bootstrap from "@root/bootstrap"
import { getIdentityAuthService, getUsersService } from "@services/identity"

import { getAuthMiddleware } from "./newmiddleware"
import getAuthenticatedSubrouter from "./newroutes/authenticated"
import getAuthenticatedSitesSubrouter from "./newroutes/authenticatedSites"
import getAuthenticatedSubrouterV1 from "./routes/authenticated"
import getAuthenticatedSitesSubrouterV1 from "./routes/authenticatedSites"

const path = require("path")

const sequelize = initSequelize([Site, SiteMember, User, Whitelist])
const usersService = getUsersService(sequelize)

const axios = require("axios")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const express = require("express")
const helmet = require("helmet")
const createError = require("http-errors")

// Env vars
const { FRONTEND_URL, GITHUB_ORG_NAME } = process.env

// Import middleware

// Import routes
const { apiLogger } = require("@middleware/apiLogger")
const { errorHandler } = require("@middleware/errorHandler")

const axiosInstance = axios.create({
  baseURL: `https://api.github.com/repos/${GITHUB_ORG_NAME}/`,
})

axiosInstance.interceptors.request.use((config) => ({
  ...config,
  headers: {
    ...config.headers,
    "Content-Type": "application/json",
  },
}))

const { GitHubService } = require("@services/db/GitHubService")
const {
  ConfigYmlService,
} = require("@services/fileServices/YmlFileServices/ConfigYmlService")
const { AuthService } = require("@services/utilServices/AuthService")

const { AuthRouter } = require("./newroutes/auth")

const authService = new AuthService({ usersService })

const gitHubService = new GitHubService({ axiosInstance })
const identityAuthService = getIdentityAuthService(gitHubService)
const configYmlService = new ConfigYmlService({ gitHubService })

const authMiddleware = getAuthMiddleware({ identityAuthService })

const authenticatedSubrouterV1 = getAuthenticatedSubrouterV1({
  authMiddleware,
  usersService,
})
const authenticatedSitesSubrouterV1 = getAuthenticatedSitesSubrouterV1({
  authMiddleware,
})

const authenticatedSubrouterV2 = getAuthenticatedSubrouter({
  authMiddleware,
  gitHubService,
  configYmlService,
  usersService,
})
const authenticatedSitesSubrouterV2 = getAuthenticatedSitesSubrouter({
  authMiddleware,
  gitHubService,
  configYmlService,
})
const authV2Router = new AuthRouter({ authMiddleware, authService })

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

// Log api requests
app.use(apiLogger)

// Health endpoint
app.use("/v2/ping", (req, res, next) => res.status(200).send("Ok"))

// Routes layer setup
// To avoid refactoring auth router v1 to use dependency injection
app.use("/v1/auth", authV2Router.getRouter())
// Endpoints which have siteName, used to inject site access token
app.use("/v1/sites/:siteName", authenticatedSitesSubrouterV1)
// Endpoints which have require login, but not site access token
app.use("/v1", authenticatedSubrouterV1)

app.use("/v2/auth", authV2Router.getRouter())
// Endpoints which have siteName, used to inject site access token
app.use("/v2/sites/:siteName", authenticatedSitesSubrouterV2)
// Endpoints which have require login, but not site access token
app.use("/v2", authenticatedSubrouterV2)

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
