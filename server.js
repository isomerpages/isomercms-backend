const path = require("path")

const axios = require("axios")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const express = require("express")
const helmet = require("helmet")
const createError = require("http-errors")
const logger = require("morgan")

// Env vars
const { FRONTEND_URL, GITHUB_ORG_NAME } = process.env

// Import middleware
const { apiLogger } = require("@middleware/apiLogger")
const { errorHandler } = require("@middleware/errorHandler")

// Import routes
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

const { SettingsService } = require("@services/configServices/SettingsService")
const { GitHubService } = require("@services/db/GitHubService")
const {
  BaseDirectoryService,
} = require("@services/directoryServices/BaseDirectoryService")
const {
  CollectionDirectoryService,
} = require("@services/directoryServices/CollectionDirectoryService")
const {
  MediaDirectoryService,
} = require("@services/directoryServices/MediaDirectoryService")
const {
  ResourceDirectoryService,
} = require("@services/directoryServices/ResourceDirectoryService")
const {
  ResourceRoomDirectoryService,
} = require("@services/directoryServices/ResourceRoomDirectoryService")
const {
  SubcollectionDirectoryService,
} = require("@services/directoryServices/SubcollectionDirectoryService")
const {
  UnlinkedPagesDirectoryService,
} = require("@services/directoryServices/UnlinkedPagesDirectoryService")
const {
  CollectionPageService,
} = require("@services/fileServices/MdPageServices/CollectionPageService")
const {
  HomepagePageService,
} = require("@services/fileServices/MdPageServices/HomepagePageService")
const {
  MediaFileService,
} = require("@services/fileServices/MdPageServices/MediaFileService")
const {
  ResourcePageService,
} = require("@services/fileServices/MdPageServices/ResourcePageService")
const {
  SubcollectionPageService,
} = require("@services/fileServices/MdPageServices/SubcollectionPageService")
const {
  UnlinkedPageService,
} = require("@services/fileServices/MdPageServices/UnlinkedPageService")
const {
  CollectionYmlService,
} = require("@services/fileServices/YmlFileServices/CollectionYmlService")
const {
  ConfigYmlService,
} = require("@services/fileServices/YmlFileServices/ConfigYmlService")
const {
  FooterYmlService,
} = require("@services/fileServices/YmlFileServices/FooterYmlService")
const {
  NavYmlService,
} = require("@services/fileServices/YmlFileServices/NavYmlService")
const { MoverService } = require("@services/moverServices/MoverService")
const { AuthService } = require("@services/utilServices/AuthService")

const { AuthRouter } = require("./newroutes/auth")
const { CollectionPagesRouter } = require("./newroutes/collectionPages")
const { CollectionsRouter } = require("./newroutes/collections")
const { MediaCategoriesRouter } = require("./newroutes/mediaCategories")
const { MediaFilesRouter } = require("./newroutes/mediaFiles")
const { ResourceCategoriesRouter } = require("./newroutes/resourceCategories")
const { ResourcePagesRouter } = require("./newroutes/resourcePages")
const { ResourceRoomRouter } = require("./newroutes/resourceRoom")
const { SettingsRouter } = require("./newroutes/settings")
const { UnlinkedPagesRouter } = require("./newroutes/unlinkedPages")

const authService = new AuthService()
const gitHubService = new GitHubService({ axiosInstance })
const collectionYmlService = new CollectionYmlService({ gitHubService })
const homepagePageService = new HomepagePageService({ gitHubService })
const configYmlService = new ConfigYmlService({ gitHubService })
const footerYmlService = new FooterYmlService({ gitHubService })
const navYmlService = new NavYmlService({ gitHubService })
const collectionPageService = new CollectionPageService({
  gitHubService,
  collectionYmlService,
})
const subcollectionPageService = new SubcollectionPageService({
  gitHubService,
  collectionYmlService,
})
const unlinkedPageService = new UnlinkedPageService({ gitHubService })
const resourcePageService = new ResourcePageService({ gitHubService })
const mediaFileService = new MediaFileService({ gitHubService })
const moverService = new MoverService({
  unlinkedPageService,
  collectionPageService,
  subcollectionPageService,
})
const baseDirectoryService = new BaseDirectoryService({ gitHubService })
const unlinkedPagesDirectoryService = new UnlinkedPagesDirectoryService({
  baseDirectoryService,
  moverService,
})
const collectionDirectoryService = new CollectionDirectoryService({
  baseDirectoryService,
  navYmlService,
  collectionYmlService,
  moverService,
})
const subcollectionDirectoryService = new SubcollectionDirectoryService({
  baseDirectoryService,
  collectionYmlService,
  moverService,
  subcollectionPageService,
  gitHubService,
})
const resourceDirectoryService = new ResourceDirectoryService({
  baseDirectoryService,
  gitHubService,
})
const resourceRoomDirectoryService = new ResourceRoomDirectoryService({
  baseDirectoryService,
  configYmlService,
  gitHubService,
})
const mediaDirectoryService = new MediaDirectoryService({
  baseDirectoryService,
  gitHubService,
})
const settingsService = new SettingsService({
  homepagePageService,
  configYmlService,
  footerYmlService,
  navYmlService,
})

const authV2Router = new AuthRouter({ authService })
const unlinkedPagesRouter = new UnlinkedPagesRouter({
  unlinkedPageService,
  unlinkedPagesDirectoryService,
})
const collectionPagesV2Router = new CollectionPagesRouter({
  collectionPageService,
  subcollectionPageService,
})
const collectionsV2Router = new CollectionsRouter({
  collectionDirectoryService,
  subcollectionDirectoryService,
})
const resourcePagesV2Router = new ResourcePagesRouter({
  resourcePageService,
})
const resourceDirectoryV2Router = new ResourceCategoriesRouter({
  resourceDirectoryService,
})
const mediaFilesV2Router = new MediaFilesRouter({
  mediaFileService,
})
const mediaDirectoryV2Router = new MediaCategoriesRouter({
  mediaDirectoryService,
})
const resourceRoomV2Router = new ResourceRoomRouter({
  resourceRoomDirectoryService,
})
const settingsV2Router = new SettingsRouter({ settingsService })

const app = express()
app.use(helmet())

app.use(logger("dev"))
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

app.use("/v2/auth", authV2Router.getRouter())
app.use("/v2/sites", collectionPagesV2Router.getRouter())
app.use("/v2/sites", unlinkedPagesRouter.getRouter())
app.use("/v2/sites", collectionsV2Router.getRouter())
app.use("/v2/sites", resourcePagesV2Router.getRouter())
app.use("/v2/sites", resourceDirectoryV2Router.getRouter())
app.use("/v2/sites", mediaFilesV2Router.getRouter())
app.use("/v2/sites", mediaDirectoryV2Router.getRouter())
app.use("/v2/sites", resourceRoomV2Router.getRouter())
app.use("/v2/sites", settingsV2Router.getRouter())

// catch unknown routes
app.use((req, res, next) => {
  if (!req.route) {
    return res.status(404).send("Unknown route requested")
  }
  return next()
})

app.use("/v2/ping", (req, res, next) => res.status(200).send("Ok"))

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// error handler
app.use(errorHandler)

module.exports = app
