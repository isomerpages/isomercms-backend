const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { attachSiteHandler } = require("@root/middleware")

class SitesRouter {
  constructor({ sitesService }) {
    this.sitesService = sitesService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  async getSites(req, res) {
    const { userSessionData } = res.locals
    const siteNames = await this.sitesService.getSites(userSessionData)
    return res.status(200).json({ siteNames })
  }

  async checkHasAccess(req, res) {
    const { userSessionData } = res.locals

    await this.sitesService.checkHasAccess(userSessionData)
    return res.status(200).send("OK")
  }

  async getLastUpdated(req, res) {
    const { userSessionData } = res.locals
    const lastUpdated = await this.sitesService.getLastUpdated(userSessionData)
    return res.status(200).json({ lastUpdated })
  }

  async getStagingUrl(req, res) {
    const { userSessionData } = res.locals

    const stagingUrl = await this.sitesService.getStagingUrl(userSessionData)
    return res.status(200).json({ stagingUrl })
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get("/", attachReadRouteHandlerWrapper(this.getSites))
    router.get(
      "/:siteName",
      attachSiteHandler,
      attachReadRouteHandlerWrapper(this.checkHasAccess)
    )
    router.get(
      "/:siteName/lastUpdated",
      attachSiteHandler,
      attachReadRouteHandlerWrapper(this.getLastUpdated)
    )
    router.get(
      "/:siteName/stagingUrl",
      attachSiteHandler,
      attachReadRouteHandlerWrapper(this.getStagingUrl)
    )

    return router
  }
}

module.exports = { SitesRouter }
