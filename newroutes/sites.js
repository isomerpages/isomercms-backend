const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

class SitesRouter {
  constructor({ sitesService }) {
    this.sitesService = sitesService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  async getSites(req, res) {
    const { accessToken } = req
    const siteNames = await this.sitesService.getSites({ accessToken })
    return res.status(200).json({ siteNames })
  }

  async checkHasAccess(req, res) {
    const {
      accessToken,
      userId,
      params: { siteName },
    } = req

    await this.sitesService.checkHasAccess(
      {
        accessToken,
        siteName,
      },
      { userId }
    )
    return res.status(200).send("OK")
  }

  async getLastUpdated(req, res) {
    const {
      accessToken,
      params: { siteName },
    } = req
    const lastUpdated = await this.sitesService.getLastUpdated({
      accessToken,
      siteName,
    })
    return res.status(200).json({ lastUpdated })
  }

  async getStagingUrl(req, res) {
    const {
      accessToken,
      params: { siteName },
    } = req

    const stagingUrl = await this.sitesService.getStagingUrl({
      accessToken,
      siteName,
    })
    return res.status(200).json({ stagingUrl })
  }

  getRouter() {
    const router = express.Router()

    router.get("/", attachReadRouteHandlerWrapper(this.getSites))
    router.get("/:siteName", attachReadRouteHandlerWrapper(this.checkHasAccess))
    router.get(
      "/:siteName/lastUpdated",
      attachReadRouteHandlerWrapper(this.getLastUpdated)
    )
    router.get(
      "/:siteName/stagingUrl",
      attachReadRouteHandlerWrapper(this.getStagingUrl)
    )

    return router
  }
}

module.exports = { SitesRouter }
