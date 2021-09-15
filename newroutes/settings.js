const autoBind = require("auto-bind")
const Bluebird = require("bluebird")
const express = require("express")
const _ = require("lodash")

const { BadRequestError } = require("@errors/BadRequestError")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const { UpdateSettingsRequestSchema } = require("@validators/RequestSchema")

const shouldUpdateHomepage = (updatedConfigContent, configContent) => {
  if (
    (updatedConfigContent.title &&
      configContent.title !== updatedConfigContent.title) ||
    (updatedConfigContent.description &&
      configContent.description !== updatedConfigContent.description)
  )
    return true
  return false
}
const extractConfigFields = (config) => ({
  url: config.content.url,
  description: config.content.description,
  title: config.content.title,
  favicon: config.content.favicon,
  shareicon: config.content.shareicon,
  is_government: config.content.is_government,
  facebook_pixel: config.content["facebook-pixel"],
  google_analytics: config.content.google_analytics,
  linkedin_insights: config.content["linkedin-insights"],
  resources_name: config.content.resources_name,
  colors: config.content.colors,
})
const extractFooterFields = (footer) => footer.content
const extractNavFields = (navigation) => ({
  logo: navigation.content.logo,
})

const mergeUpdatedData = (currentData, updatedData) => {
  const clonedCurrentData = _.cloneDeep(currentData)
  Object.keys(updatedData).forEach((field) => {
    clonedCurrentData[field] = updatedData[field]
  })
  return clonedCurrentData
}

class SettingsRouter {
  constructor({
    configYmlService,
    footerYmlService,
    navYmlService,
    homepagePageService,
  }) {
    this.configYmlService = configYmlService
    this.footerYmlService = footerYmlService
    this.navYmlService = navYmlService
    this.homepagePageService = homepagePageService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  async readSettingsPage(req, res) {
    const { accessToken } = req
    const { siteName } = req.params
    const reqDetails = { siteName, accessToken }

    const { config, footer, navigation } = await this.retrieveSettingsFiles(
      reqDetails
    )

    return res.status(200).json({
      configSettings: extractConfigFields(config),
      footerSettings: extractFooterFields(footer),
      navigationSettings: extractNavFields(navigation),
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
    } = await this.retrieveSettingsFiles(reqDetails, true)

    // extract data
    const {
      configSettings: updatedConfigContent,
      footerSettings: updatedFooterContent,
      navigationSettings: updatedNavigationContent,
    } = body

    if (!_.isEmpty(updatedConfigContent)) {
      const mergedConfigContent = mergeUpdatedData(
        config.content,
        updatedConfigContent
      )
      await this.configYmlService.update(reqDetails, {
        fileContent: mergedConfigContent,
        sha: config.sha,
      })

      // update homepage title only if necessary
      if (shouldUpdateHomepage(updatedConfigContent, config.content)) {
        const updatedHomepageFrontMatter = _.cloneDeep(
          homepage.content.frontMatter
        )
        updatedHomepageFrontMatter.title = updatedConfigContent.title
        updatedHomepageFrontMatter.description =
          updatedConfigContent.description
        await this.homepagePageService.update(reqDetails, {
          content: homepage.content.pageBody,
          frontMatter: updatedHomepageFrontMatter,
          sha: homepage.sha,
        })
      }
    }

    if (!_.isEmpty(updatedFooterContent)) {
      const mergedFooterContent = mergeUpdatedData(
        footer.content,
        updatedFooterContent
      )
      await this.footerYmlService.update(reqDetails, {
        fileContent: mergedFooterContent,
        sha: footer.sha,
      })
    }

    if (!_.isEmpty(updatedNavigationContent)) {
      const mergedNavigationContent = mergeUpdatedData(
        navigation.content,
        updatedNavigationContent
      )
      await this.navYmlService.update(reqDetails, {
        fileContent: mergedNavigationContent,
        sha: navigation.sha,
      })
    }

    return res.status(200).send("OK")
  }

  async retrieveSettingsFiles(reqDetails, shouldRetrieveHomepage) {
    const fileRetrievalObj = {
      config: this.configYmlService.read(reqDetails),
      footer: this.footerYmlService.read(reqDetails),
      navigation: this.navYmlService.read(reqDetails),
      homepage: this.homepagePageService.read(reqDetails),
    }

    const [config, footer, navigation, homepage] = await Bluebird.map(
      Object.keys(fileRetrievalObj),
      async (fileOpKey) => {
        if (fileOpKey === "homepage" && !shouldRetrieveHomepage) {
          return
        }
        return await fileRetrievalObj[fileOpKey]
      }
    )

    return {
      config,
      footer,
      navigation,
      homepage,
    }
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
