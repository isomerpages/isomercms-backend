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
const { auth } = require("@middleware/auth")
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
const indexRouter = require("@routes/index")
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

const {
  SubcollectionPageService,
} = require("@root/services/fileServices/MdPageServices/SubcollectionPageService")
const {
  ConfigYmlService,
} = require("@root/services/fileServices/YmlFileServices/ConfigYmlService")
const {
  FooterYmlService,
} = require("@root/services/fileServices/YmlFileServices/FooterYmlService")
const { GitHubService } = require("@services/db/GitHubService")
const {
  BaseDirectoryService,
} = require("@services/directoryServices/BaseDirectoryService")
const {
  CollectionDirectoryService,
} = require("@services/directoryServices/CollectionDirectoryService")
const {
  ResourceDirectoryService,
} = require("@services/directoryServices/ResourceDirectoryService")
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
  ResourcePageService,
} = require("@services/fileServices/MdPageServices/ResourcePageService")
const {
  UnlinkedPageService,
} = require("@services/fileServices/MdPageServices/UnlinkedPageService")
const {
  CollectionYmlService,
} = require("@services/fileServices/YmlFileServices/CollectionYmlService")
const {
  NavYmlService,
} = require("@services/fileServices/YmlFileServices/NavYmlService")
const { MoverService } = require("@services/moverServices/MoverService")

const { CollectionPagesRouter } = require("./newroutes/collectionPages")
const { CollectionsRouter } = require("./newroutes/collections")
const { ResourceCategoriesRouter } = require("./newroutes/resourceCategories")
const { ResourcePagesRouter } = require("./newroutes/resourcePages")
const { SettingsRouter } = require("./newroutes/settings")
const { UnlinkedPagesRouter } = require("./newroutes/unlinkedPages")
const { SettingsService } = require("./services/configServices/settingsService")

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

const settingsService = new SettingsService({
  homepagePageService,
  configYmlService,
  footerYmlService,
  navYmlService,
})

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

// Use auth middleware
app.use(auth)

// Log api requests
app.use(apiLogger)

// Routes layer setup
app.use("/v1", indexRouter)
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

app.use("/v2/sites", collectionPagesV2Router.getRouter())
app.use("/v2/sites", unlinkedPagesRouter.getRouter())
app.use("/v2/sites", collectionsV2Router.getRouter())
app.use("/v2/sites", resourcePagesV2Router.getRouter())
app.use("/v2/sites", resourceDirectoryV2Router.getRouter())
app.use("/v2/sites", settingsV2Router.getRouter())

app.use("/v2/ping", (req, res, next) => res.status(200).send("Ok"))

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404))
})

// error handler
app.use(errorHandler)

module.exports = app
