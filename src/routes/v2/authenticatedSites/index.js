import { attachSiteHandler } from "@root/middleware"

const express = require("express")

const {
  CollectionPagesRouter,
} = require("@routes/v2/authenticatedSites/collectionPages")
const {
  CollectionsRouter,
} = require("@routes/v2/authenticatedSites/collections")
const { ContactUsRouter } = require("@routes/v2/authenticatedSites/contactUs")
const { HomepageRouter } = require("@routes/v2/authenticatedSites/homepage")
const {
  MediaCategoriesRouter,
} = require("@routes/v2/authenticatedSites/mediaCategories")
const { MediaFilesRouter } = require("@routes/v2/authenticatedSites/mediaFiles")
const { NavigationRouter } = require("@routes/v2/authenticatedSites/navigation")
const {
  RepoManagementRouter,
} = require("@routes/v2/authenticatedSites/repoManagement")
const {
  ResourceCategoriesRouter,
} = require("@routes/v2/authenticatedSites/resourceCategories")
const {
  ResourcePagesRouter,
} = require("@routes/v2/authenticatedSites/resourcePages")
const {
  ResourceRoomRouter,
} = require("@routes/v2/authenticatedSites/resourceRoom")
const { SettingsRouter } = require("@routes/v2/authenticatedSites/settings")
const {
  UnlinkedPagesRouter,
} = require("@routes/v2/authenticatedSites/unlinkedPages")

const { SettingsService } = require("@services/configServices/SettingsService")
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
  ContactUsPageService,
} = require("@services/fileServices/MdPageServices/ContactUsPageService")
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
  FooterYmlService,
} = require("@services/fileServices/YmlFileServices/FooterYmlService")
const {
  NavYmlService,
} = require("@services/fileServices/YmlFileServices/NavYmlService")
const { MoverService } = require("@services/moverServices/MoverService")

const getAuthenticatedSitesSubrouter = ({
  authenticationMiddleware,
  authorizationMiddleware,
  gitHubService,
  configYmlService,
  apiLogger,
  notificationOnEditHandler,
  sitesService,
  deploymentsService,
  repoManagementService,
}) => {
  const collectionYmlService = new CollectionYmlService({ gitHubService })
  const homepagePageService = new HomepagePageService({ gitHubService })
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
  const mediaFileService = new MediaFileService({ repoService: gitHubService })
  const moverService = new MoverService({
    unlinkedPageService,
    collectionPageService,
    subcollectionPageService,
  })
  const baseDirectoryService = new BaseDirectoryService({
    repoService: gitHubService,
  })
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
  const contactUsPageService = new ContactUsPageService({
    gitHubService,
    footerYmlService,
  })
  const settingsService = new SettingsService({
    homepagePageService,
    configYmlService,
    footerYmlService,
    navYmlService,
    sitesService,
    deploymentsService,
    gitHubService,
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
  const mediaFilesV2Router = new MediaFilesRouter({
    mediaFileService,
  })
  const mediaDirectoryV2Router = new MediaCategoriesRouter({
    mediaDirectoryService,
  })
  const resourceRoomV2Router = new ResourceRoomRouter({
    resourceRoomDirectoryService,
  })
  const contactUsV2Router = new ContactUsRouter({ contactUsPageService })
  const homepageV2Router = new HomepageRouter({ homepagePageService })
  const settingsV2Router = new SettingsRouter({
    settingsService,
    authorizationMiddleware,
  })
  const navigationV2Router = new NavigationRouter({
    navigationYmlService: navYmlService,
  })
  const repoManagementV2Router = new RepoManagementRouter({
    repoManagementService,
    authorizationMiddleware,
  })

  const authenticatedSitesSubrouter = express.Router({ mergeParams: true })

  authenticatedSitesSubrouter.use(authenticationMiddleware.verifyAccess)
  authenticatedSitesSubrouter.use(attachSiteHandler)
  // NOTE: apiLogger needs to be after `verifyJwt` as it logs the github username
  // which is only available after verifying that the jwt is valid
  authenticatedSitesSubrouter.use(apiLogger)
  authenticatedSitesSubrouter.use(authorizationMiddleware.verifySiteMember)

  authenticatedSitesSubrouter.use(
    "/collections/:collectionName",
    collectionPagesV2Router.getRouter()
  )
  authenticatedSitesSubrouter.use("/pages", unlinkedPagesRouter.getRouter())
  authenticatedSitesSubrouter.use(
    "/collections",
    collectionsV2Router.getRouter()
  )
  authenticatedSitesSubrouter.use(
    "/resourceRoom/:resourceRoomName/resources/:resourceCategoryName/pages",
    resourcePagesV2Router.getRouter()
  )
  authenticatedSitesSubrouter.use(
    "/resourceRoom/:resourceRoomName/resources",
    resourceDirectoryV2Router.getRouter()
  )
  authenticatedSitesSubrouter.use(
    "/media/:directoryName/pages",
    mediaFilesV2Router.getRouter()
  )
  authenticatedSitesSubrouter.use("/media", mediaDirectoryV2Router.getRouter())
  authenticatedSitesSubrouter.use("/navigation", navigationV2Router.getRouter())
  authenticatedSitesSubrouter.use(
    "/resourceRoom",
    resourceRoomV2Router.getRouter()
  )
  authenticatedSitesSubrouter.use("/contactUs", contactUsV2Router.getRouter())
  authenticatedSitesSubrouter.use("/homepage", homepageV2Router.getRouter())
  authenticatedSitesSubrouter.use("/settings", settingsV2Router.getRouter())
  authenticatedSitesSubrouter.use("/admin", repoManagementV2Router.getRouter())
  authenticatedSitesSubrouter.use(notificationOnEditHandler.createNotification)

  return authenticatedSitesSubrouter
}

export default getAuthenticatedSitesSubrouter
