const autoBind = require("auto-bind")
const express = require("express")
const _ = require("lodash")

const { BadRequestError } = require("@errors/BadRequestError")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const {
  UpdateSettingsRequestSchema,
  UpdateRepoPasswordRequestSchema,
} = require("@validators/RequestSchema")

const { SettingsService } = require("@services/configServices/SettingsService")

class SettingsRouter {
  constructor({ settingsService }) {
    this.settingsService = settingsService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  async readSettingsPage(req, res) {
    const { userWithSiteSessionData } = res.locals

    const {
      config,
      footer,
      navigation,
    } = await this.settingsService.retrieveSettingsFiles(
      userWithSiteSessionData
    )

    return res.status(200).json({
      ...SettingsService.extractConfigFields(config),
      ...SettingsService.extractFooterFields(footer),
      ...SettingsService.extractNavFields(navigation),
    })
  }

  async updateSettingsPage(req, res, next) {
    const { body } = req
    const { userWithSiteSessionData } = res.locals

    const { error } = UpdateSettingsRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)

    const {
      config,
      footer,
      navigation,
      homepage,
    } = await this.settingsService.retrieveSettingsFiles(
      userWithSiteSessionData,
      true
    )

    // extract data
    const settings = body
    const {
      configContent: updatedConfigContent,
      footerContent: updatedFooterContent,
      navigationContent: updatedNavigationContent,
    } = SettingsService.retrieveSettingsFields(settings)

    await this.settingsService.updateSettingsFiles(userWithSiteSessionData, {
      config,
      homepage,
      footer,
      navigation,
      updatedConfigContent,
      updatedFooterContent,
      updatedNavigationContent,
    })
    res.status(200).send("OK")
    return next()
  }

  async getRepoPassword(_req, res, _next) {
    const { userWithSiteSessionData } = res.locals

    const passwordRes = await this.settingsService.getEncryptedPassword(
      userWithSiteSessionData
    )

    if (passwordRes.isErr()) {
      throw passwordRes.error
    }

    return res.status(200).send(passwordRes.value)
  }

  async updateRepoPassword(req, res, next) {
    const { body } = req
    const { userWithSiteSessionData } = res.locals

    const { error } = UpdateRepoPasswordRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)

    const { password, enablePassword } = body
    const passwordRes = await this.settingsService.updatePassword(
      userWithSiteSessionData,
      {
        password,
        enablePassword,
      }
    )

    if (passwordRes.isErr()) {
      throw passwordRes.error
    }

    res.status(200).send("OK")
    return next()
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get("/", attachReadRouteHandlerWrapper(this.readSettingsPage))
    router.post("/", attachRollbackRouteHandlerWrapper(this.updateSettingsPage))
    router.get(
      "/repo-password",
      attachReadRouteHandlerWrapper(this.getRepoPassword)
    )
    router.post(
      "/repo-password",
      attachRollbackRouteHandlerWrapper(this.updateRepoPassword)
    )

    return router
  }
}

module.exports = { SettingsRouter }
