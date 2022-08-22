const autoBind = require("auto-bind")
const Bluebird = require("bluebird")
const _ = require("lodash")

class SettingsService {
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

  async retrieveSettingsFiles(sessionData, shouldRetrieveHomepage) {
    const fileRetrievalObj = {
      config: this.configYmlService.read(sessionData),
      footer: this.footerYmlService.read(sessionData),
      navigation: this.navYmlService.read(sessionData),
      homepage: this.homepagePageService.read(sessionData),
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

  async updateSettingsFiles({
    sessionData,
    config,
    homepage,
    footer,
    navigation,
    updatedConfigContent,
    updatedFooterContent,
    updatedNavigationContent,
  }) {
    if (!_.isEmpty(updatedConfigContent)) {
      const mergedConfigContent = this.mergeUpdatedData(
        config.content,
        updatedConfigContent
      )
      // Prepend "https://" to url parameter if parameter is defined
      if (
        mergedConfigContent.url !== "" &&
        !mergedConfigContent.url.startsWith("https://")
      ) {
        mergedConfigContent.url = `https://${mergedConfigContent.url}`
      }

      await this.configYmlService.update(sessionData, {
        fileContent: mergedConfigContent,
        sha: config.sha,
      })

      // update homepage title only if necessary
      if (this.shouldUpdateHomepage(updatedConfigContent, config.content)) {
        const updatedHomepageFrontMatter = _.cloneDeep(
          homepage.content.frontMatter
        )
        if (updatedConfigContent.title)
          updatedHomepageFrontMatter.title = updatedConfigContent.title
        if (updatedConfigContent.description)
          updatedHomepageFrontMatter.description =
            updatedConfigContent.description
        if (updatedConfigContent.shareicon)
          updatedHomepageFrontMatter.image = updatedConfigContent.shareicon
        await this.homepagePageService.update(sessionData, {
          content: homepage.content.pageBody,
          frontMatter: updatedHomepageFrontMatter,
          sha: homepage.sha,
        })
      }
    }

    if (!_.isEmpty(updatedFooterContent)) {
      const mergedFooterContent = this.mergeUpdatedFooterData(
        footer.content,
        updatedFooterContent
      )
      await this.footerYmlService.update(sessionData, {
        fileContent: mergedFooterContent,
        sha: footer.sha,
      })
    }

    if (!_.isEmpty(updatedNavigationContent)) {
      const mergedNavigationContent = this.mergeUpdatedData(
        navigation.content,
        updatedNavigationContent
      )
      await this.navYmlService.update(sessionData, {
        fileContent: mergedNavigationContent,
        sha: navigation.sha,
      })
    }
  }

  shouldUpdateHomepage(updatedConfigContent, configContent) {
    if (
      (updatedConfigContent.title &&
        configContent.title !== updatedConfigContent.title) ||
      (updatedConfigContent.description &&
        configContent.description !== updatedConfigContent.description) ||
      (updatedConfigContent.shareicon &&
        configContent.shareicon !== updatedConfigContent.shareicon)
    )
      return true
    return false
  }

  mergeUpdatedData(currentData, updatedData) {
    const clonedCurrentData = _.cloneDeep(currentData)
    Object.keys(updatedData).forEach((field) => {
      clonedCurrentData[field] = updatedData[field]
    })
    return clonedCurrentData
  }

  mergeUpdatedFooterData(currentData, updatedData) {
    // Special configuration to remove empty footer settings entirely so they don't show up in the actual site
    const clonedCurrentData = _.cloneDeep(currentData)
    Object.keys(updatedData).forEach((field) => {
      if (field === "social_media") {
        const socials = updatedData[field]
        Object.keys(socials).forEach((social) => {
          if (!socials[social]) {
            delete clonedCurrentData[field][social]
          } else {
            clonedCurrentData[field] = updatedData[field]
          }
        })
      } else if (updatedData[field] === "") {
        // Check for empty string because false value exists
        delete clonedCurrentData[field]
      } else {
        clonedCurrentData[field] = updatedData[field]
      }
    })
    return clonedCurrentData
  }

  static extractConfigFields(config) {
    return {
      url: config.content.url.replace("https://", ""),
      description: config.content.description,
      title: config.content.title,
      favicon: config.content.favicon,
      shareicon: config.content.shareicon,
      is_government: config.content.is_government,
      facebook_pixel: config.content["facebook-pixel"],
      google_analytics: config.content.google_analytics,
      linkedin_insights: config.content["linkedin-insights"],
      colors: config.content.colors,
    }
  }

  static extractFooterFields(footer) {
    return footer.content
  }

  static extractNavFields(navigation) {
    return {
      logo: navigation.content.logo,
    }
  }

  static retrieveSettingsFields(settings) {
    const configParams = [
      "url",
      "description",
      "title",
      "favicon",
      "shareicon",
      "is_government",
      "facebook-pixel",
      "google_analytics",
      "linkedin-insights",
      "colors",
    ]
    const footerParams = [
      "contact_us",
      "show_reach",
      "feedback",
      "faq",
      "social_media",
    ]
    const navigationParams = ["logo"]

    const configContent = configParams.reduce(
      (acc, curr) => ({
        ...acc,
        ...(curr in settings && { [curr]: settings[curr] }),
      }),
      {}
    )
    const footerContent = footerParams.reduce(
      (acc, curr) => ({
        ...acc,
        ...(curr in settings && { [curr]: settings[curr] }),
      }),
      {}
    )
    const navigationContent = navigationParams.reduce(
      (acc, curr) => ({
        ...acc,
        ...(curr in settings && { [curr]: settings[curr] }),
      }),
      {}
    )
    return {
      configContent,
      footerContent,
      navigationContent,
    }
  }
}

module.exports = { SettingsService }
