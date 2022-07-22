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

const { SettingsService } = require("@services/configServices/SettingsService")

class SettingsRouter {
  constructor({ settingsService }) {
    this.settingsService = settingsService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  async readSettingsPage(req, res) {
    const { sessionData } = res.locals

    const {
      config,
      footer,
      navigation,
    } = await this.settingsService.retrieveSettingsFiles(sessionData)

    return res.status(200).json({
      ...SettingsService.extractConfigFields(config),
      ...SettingsService.extractFooterFields(footer),
      ...SettingsService.extractNavFields(navigation),
    })
  }

  async updateSettingsPage(req, res) {
    const { body } = req
    const { sessionData } = res.locals

    const { error } = UpdateSettingsRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)

    const {
      config,
      footer,
      navigation,
      homepage,
    } = await this.settingsService.retrieveSettingsFiles(sessionData, true)

    // extract data
    const settings = body
    const {
      configContent: updatedConfigContent,
      footerContent: updatedFooterContent,
      navigationContent: updatedNavigationContent,
    } = SettingsService.retrieveSettingsFields(settings)

    await this.settingsService.updateSettingsFiles({
      sessionData,
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
    const router = express.Router({ mergeParams: true })

    router.get("/", attachReadRouteHandlerWrapper(this.readSettingsPage))
    router.post("/", attachRollbackRouteHandlerWrapper(this.updateSettingsPage))

    return router
  }
}

module.exports = { SettingsRouter }
