const express = require("express")

const {
  CollectionPagesRouter,
} = require("@root/newroutes/authenticatedSites/collectionPages")
const {
  CollectionsRouter,
} = require("@root/newroutes/authenticatedSites/collections")
const {
  ContactUsRouter,
} = require("@root/newroutes/authenticatedSites/contactUs")
const {
  MediaCategoriesRouter,
} = require("@root/newroutes/authenticatedSites/mediaCategories")
const {
  MediaFilesRouter,
} = require("@root/newroutes/authenticatedSites/mediaFiles")
const {
  ResourceCategoriesRouter,
} = require("@root/newroutes/authenticatedSites/resourceCategories")
const {
  ResourcePagesRouter,
} = require("@root/newroutes/authenticatedSites/resourcePages")
const {
  ResourceRoomRouter,
} = require("@root/newroutes/authenticatedSites/resourceRoom")
const {
  SettingsRouter,
} = require("@root/newroutes/authenticatedSites/settings")
const {
  UnlinkedPagesRouter,
} = require("@root/newroutes/authenticatedSites/unlinkedPages")
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
  authMiddleware,
  gitHubService,
  configYmlService,
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
  const contactUsPageService = new ContactUsPageService({
    gitHubService,
    footerYmlService,
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
  const settingsV2Router = new SettingsRouter({ settingsService })

  const authenticatedSitesSubrouter = express.Router({ mergeParams: true })

  authenticatedSitesSubrouter.use(authMiddleware.verifyJwt)
  authenticatedSitesSubrouter.use(authMiddleware.useSiteAccessTokenIfAvailable)

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
  authenticatedSitesSubrouter.use(
    "/resourceRoom",
    resourceRoomV2Router.getRouter()
  )
  authenticatedSitesSubrouter.use("/contactUs", contactUsV2Router.getRouter())
  authenticatedSitesSubrouter.use("/settings", settingsV2Router.getRouter())

  return authenticatedSitesSubrouter
}

export default getAuthenticatedSitesSubrouter
