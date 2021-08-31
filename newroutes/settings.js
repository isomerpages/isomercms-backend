const autoBind = require("auto-bind")
const Bluebird = require("bluebird")
const express = require("express")

const { BadRequestError } = require("@errors/BadRequestError")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const extractRequiredConfigFields = (config) => ({
  url: config.url,
  title: config.title,
  favicon: config.favicon,
  shareicon: config.shareicon,
  is_government: config.is_government,
  facebook_pixel: config["facebook-pixel"],
  google_analytics: config.google_analytics,
  linkedin_insights: config["linkedin-insights"],
  resources_name: config.resources_name,
  colors: config.colors,
})

class SettingsRouter {
  constructor({ configYmlService, footerYmlService, navYmlService }) {
    this.configYmlService = configYmlService
    this.footerYmlService = footerYmlService
    this.navYmlService = navYmlService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  async readSettingsPage(req, res) {
    const { accessToken } = req
    const { siteName } = req.params
    const reqDetails = { siteName, accessToken }

    const [config, footer, navigation] = await Bluebird.map(
      [
        this.configYmlService.read(reqDetails),
        this.footerYmlService.read(reqDetails),
        this.navYmlService.read(reqDetails),
      ],
      async (fileOp) => await fileOp
    )

    // retrieve only the relevant config and index fields
    const configFieldsRequired = extractRequiredConfigFields(config.content)

    // retrieve footer sha since we are sending the footer object wholesale
    const footerSha = footer.sha

    return res.status(200).json({
      settings: {
        configFieldsRequired,
        footerContent: footer.content,
        navigationContent: { logo: navigation.content.logo },
        footerSha,
      },
    })
  }

  async updateSettingsPage(req, res) {}

  getRouter() {
    const router = express.Router()

    router.get(
      "/:siteName/settings",
      attachReadRouteHandlerWrapper(this.readSettingsPage)
    )
    router.post(
      "/:siteName/settings",
      attachRollbackRouteHandlerWrapper(this.updateSettingsPage)
    )

    return router
  }
}

module.exports = { SettingsRouter }
