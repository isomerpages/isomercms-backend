const autoBind = require("auto-bind")
const express = require("express")
const _ = require("lodash")

const { BadRequestError } = require("@errors/BadRequestError")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const { UpdateSettingsRequestSchema } = require("@validators/RequestSchema")

const {
  SettingsService,
} = require("../services/configServices/SettingsService")

class SettingsRouter {
  constructor({ settingsService }) {
    this.settingsService = settingsService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  async readSettingsPage(req, res) {
    const { accessToken } = req
    const { siteName } = req.params
    const reqDetails = { siteName, accessToken }

    const {
      config,
      footer,
      navigation,
    } = await this.settingsService.retrieveSettingsFiles(reqDetails)

    return res.status(200).json({
      configSettings: SettingsService.extractConfigFields(config),
      footerSettings: SettingsService.extractFooterFields(footer),
      navigationSettings: SettingsService.extractNavFields(navigation),
    })
  }

  async updateSettingsPage(req, res) {
    const { accessToken, body } = req
    const { siteName } = req.params

    const { error } = UpdateSettingsRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error)

    const reqDetails = { siteName, accessToken }

    const {
      config,
      footer,
      navigation,
      homepage,
    } = await this.settingsService.retrieveSettingsFiles(reqDetails, true)

    // extract data
    const {
      configSettings: updatedConfigContent,
      footerSettings: updatedFooterContent,
      navigationSettings: updatedNavigationContent,
    } = body

    await this.settingsService.updateSettingsFiles({
      reqDetails,
      config,
      homepage,
      footer,
      navigation,
      updatedConfigContent,
      updatedFooterContent,
      updatedNavigationContent,
    })
    return res.status(200).send("OK")
  }

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
