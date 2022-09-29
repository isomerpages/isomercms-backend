const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const {
  default: UserWithSiteSessionData,
} = require("@classes/UserWithSiteSessionData")

const { attachSiteHandler } = require("@root/middleware")

class SitesRouter {
  constructor({ sitesService }) {
    this.sitesService = sitesService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  addSiteNameToSessionData(userSessionData, siteName) {
    const { githubId, accessToken, isomerUserId, email } = userSessionData
    return new UserWithSiteSessionData({
      githubId,
      accessToken,
      isomerUserId,
      email,
      siteName,
    })
  }

  async getSites(req, res) {
    const { userSessionData } = res.locals
    const siteNames = await this.sitesService.getSites(userSessionData)
    return res.status(200).json({ siteNames })
  }

  async getLastUpdated(req, res) {
    const { userSessionData } = res.locals
    const { siteName } = req.params
    const userWithSiteSessionData = this.addSiteNameToSessionData(
      userSessionData,
      siteName
    )
    const lastUpdated = await this.sitesService.getLastUpdated(
      userWithSiteSessionData
    )
    return res.status(200).json({ lastUpdated })
  }

  async getStagingUrl(req, res) {
    const { userSessionData } = res.locals

    const { siteName } = req.params
    const userWithSiteSessionData = this.addSiteNameToSessionData(
      userSessionData,
      siteName
    )
    const stagingUrl = await this.sitesService.getStagingUrl(
      userWithSiteSessionData
    )
    return res.status(200).json({ stagingUrl })
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get("/", attachReadRouteHandlerWrapper(this.getSites))
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
