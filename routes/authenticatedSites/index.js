const express = require("express")

const collectionPagesRouter = require("@routes/authenticatedSites/collectionPages")
const collectionsRouter = require("@routes/authenticatedSites/collections")
const directoryRouter = require("@routes/authenticatedSites/directory")
const documentsRouter = require("@routes/authenticatedSites/documents")
const foldersRouter = require("@routes/authenticatedSites/folders")
const homepageRouter = require("@routes/authenticatedSites/homepage")
const imagesRouter = require("@routes/authenticatedSites/images")
const mediaSubfolderRouter = require("@routes/authenticatedSites/mediaSubfolder")
const navigationRouter = require("@routes/authenticatedSites/navigation")
const netlifyTomlRouter = require("@routes/authenticatedSites/netlifyToml")
const pagesRouter = require("@routes/authenticatedSites/pages")
const resourcePagesRouter = require("@routes/authenticatedSites/resourcePages")
const resourceRoomRouter = require("@routes/authenticatedSites/resourceRoom")
const resourcesRouter = require("@routes/authenticatedSites/resources")
const settingsRouter = require("@routes/authenticatedSites/settings")

const getAuthenticatedSitesSubrouter = ({ authMiddleware }) => {
  const authenticatedSitesSubrouter = express.Router({ mergeParams: true })

  authenticatedSitesSubrouter.use(authMiddleware.verifyJwt)
  authenticatedSitesSubrouter.use(authMiddleware.useSiteAccessTokenIfAvailable)

  authenticatedSitesSubrouter.use("/pages", pagesRouter)
  authenticatedSitesSubrouter.use("/collections", collectionsRouter)
  authenticatedSitesSubrouter.use(
    "/collections/:collectionName",
    collectionPagesRouter
  )
  authenticatedSitesSubrouter.use("/files", directoryRouter)
  authenticatedSitesSubrouter.use("/folders", foldersRouter)
  authenticatedSitesSubrouter.use("/resource-room", resourceRoomRouter)
  authenticatedSitesSubrouter.use("/resources", resourcesRouter)
  authenticatedSitesSubrouter.use(
    "/resources/:resourceName",
    resourcePagesRouter
  )
  authenticatedSitesSubrouter.use("/images", imagesRouter)
  authenticatedSitesSubrouter.use("/documents", documentsRouter)
  authenticatedSitesSubrouter.use("/media/:mediaType", mediaSubfolderRouter)
  authenticatedSitesSubrouter.use("/homepage", homepageRouter)
  authenticatedSitesSubrouter.use("/settings", settingsRouter)
  authenticatedSitesSubrouter.use("/navigation", navigationRouter)
  authenticatedSitesSubrouter.use("/netlify-toml", netlifyTomlRouter)

  return authenticatedSitesSubrouter
}

export default getAuthenticatedSitesSubrouter
