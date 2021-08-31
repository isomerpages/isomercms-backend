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

    // retrieve only the relevant config and index fields
    const configFieldsRequired = extractRequiredConfigFields(config.content)

    // retrieve footer sha since we are sending the footer object wholesale
    const footerSha = footer.sha

    const settings = {
      configFieldsRequired,
      footerContent: footer.content,
      navigationContent: { logo: navigation.content.logo },
      footerSha,
    }
    return res.status(200).json({ settings })
  }

  async updateSettingsPage(req, res) {
    const { accessToken, body } = req
    const { siteName } = req.params
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
      if (config.content.title !== updatedConfigContent.title) {
        const updatedHomepageFrontMatter = _.cloneDeep(
          homepage.content.frontMatter
        )
        updatedHomepageFrontMatter.title = updatedConfigContent.title
        await this.homepagePageService.update(reqDetails, {
          content: homepage.content.pageBody,
          frontMatter: updatedHomepageFrontMatter,
          sha: homepage.sha,
        })
      }
    }

    if (!_.isEmpty(updatedFooterContent)) {
      const clonedFooterContent = _.cloneDeep(footer.content)
      const clonedUpdatedFooterContent = _.cloneDeep(updatedFooterContent)
      Object.keys(updatedFooterContent).forEach((field) => {
        if (field === "social_media") {
          const socials = updatedFooterContent[field]
          Object.keys(socials).forEach((social) => {
            if (!socials[social]) {
              delete clonedFooterContent[field][social]
              delete clonedUpdatedFooterContent[field][social]
            }
          })
        } else if (updatedFooterContent[field] === "") {
          // Check for empty string because false value exists
          delete clonedFooterContent[field]
          delete clonedUpdatedFooterContent[field]
        }
      })

      const mergedFooterContent = mergeUpdatedData(
        clonedFooterContent,
        clonedUpdatedFooterContent
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
