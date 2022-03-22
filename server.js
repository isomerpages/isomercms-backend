import logger from "@logger/logger"

import initSequelize from "@database/index"
import { Site, SiteMember, User } from "@database/models"
import { getIdentityAuthService, getUsersService } from "@services/identity"

import { getAuthMiddleware } from "./newmiddleware"
import getAuthenticatedSubrouter from "./newroutes/authenticated"
import getAuthenticatedSitesSubrouter from "./newroutes/authenticatedSites"

const path = require("path")

const sequelize = initSequelize([Site, SiteMember, User])
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

const authRouter = require("@routes/auth")
const collectionPagesRouter = require("@routes/collectionPages")
const collectionsRouter = require("@routes/collections")
const directoryRouter = require("@routes/directory")
const documentsRouter = require("@routes/documents")
const foldersRouter = require("@routes/folders")
const homepageRouter = require("@routes/homepage")
const imagesRouter = require("@routes/images")
const mediaSubfolderRouter = require("@routes/mediaSubfolder")
const navigationRouter = require("@routes/navigation")
const netlifyTomlRouter = require("@routes/netlifyToml")
const pagesRouter = require("@routes/pages")
const resourcePagesRouter = require("@routes/resourcePages")
const resourceRoomRouter = require("@routes/resourceRoom")
const resourcesRouter = require("@routes/resources")
const settingsRouter = require("@routes/settings")
const sitesRouter = require("@routes/sites")

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

// Routes layer setup
app.use("/v1/auth", authRouter)
app.use("/v1/sites", sitesRouter)
app.use("/v1/sites", pagesRouter)
app.use("/v1/sites", collectionsRouter)
app.use("/v1/sites", collectionPagesRouter)
app.use("/v1/sites", directoryRouter)
app.use("/v1/sites", foldersRouter)
app.use("/v1/sites", resourceRoomRouter)
app.use("/v1/sites", resourcesRouter)
app.use("/v1/sites", resourcePagesRouter)
app.use("/v1/sites", imagesRouter)
app.use("/v1/sites", documentsRouter)
app.use("/v1/sites", mediaSubfolderRouter)
app.use("/v1/sites", homepageRouter)
app.use("/v1/sites", settingsRouter)
app.use("/v1/sites", navigationRouter)
app.use("/v1/sites", netlifyTomlRouter)
app.use("/v1/user", usersRouter.getRouter())

app.use("/v2/auth", authV2Router.getRouter())
app.use("/v2/sites/:siteName", authenticatedSitesSubrouterV2)
app.use("/v2", authenticatedSubrouterV2)

app.use("/v2/ping", (req, res, next) => res.status(200).send("Ok"))

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
  })
  .catch((err) => {
    logger.error(`Unable to connect to the database: ${err}`)
    // If we cannot connect to the db, report an error using status code
    // And gracefully shut down the application since we can't serve client
    process.exit(1)
  })

module.exports = app
