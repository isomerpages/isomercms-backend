import { attachSiteHandler } from "@root/middleware"

const express = require("express")

const collectionPagesRouter = require("@routes/v1/authenticatedSites/collectionPages")
const collectionsRouter = require("@routes/v1/authenticatedSites/collections")
const directoryRouter = require("@routes/v1/authenticatedSites/directory")
const documentsRouter = require("@routes/v1/authenticatedSites/documents")
const foldersRouter = require("@routes/v1/authenticatedSites/folders")
const homepageRouter = require("@routes/v1/authenticatedSites/homepage")
const imagesRouter = require("@routes/v1/authenticatedSites/images")
const mediaSubfolderRouter = require("@routes/v1/authenticatedSites/mediaSubfolder")
const navigationRouter = require("@routes/v1/authenticatedSites/navigation")
const netlifyTomlRouter = require("@routes/v1/authenticatedSites/netlifyToml")
const pagesRouter = require("@routes/v1/authenticatedSites/pages")
const resourcePagesRouter = require("@routes/v1/authenticatedSites/resourcePages")
const resourceRoomRouter = require("@routes/v1/authenticatedSites/resourceRoom")
const resourcesRouter = require("@routes/v1/authenticatedSites/resources")
const settingsRouter = require("@routes/v1/authenticatedSites/settings")

const getAuthenticatedSitesSubrouter = ({
  authenticationMiddleware,
  authorizationMiddleware,
  apiLogger
}) => {
  const authenticatedSitesSubrouter = express.Router({ mergeParams: true })

  authenticatedSitesSubrouter.use(authenticationMiddleware.verifyJwt)
  authenticatedSitesSubrouter.use(attachSiteHandler)
  // NOTE: apiLogger needs to be after `verifyJwt` as it logs the github username
  // which is only available after verifying that the jwt is valid
  authenticatedSitesSubrouter.use(apiLogger)
  authenticatedSitesSubrouter.use(authorizationMiddleware.checkIsSiteMember)

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
