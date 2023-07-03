const autoBind = require("auto-bind")
const Bluebird = require("bluebird")
const _ = require("lodash")
const { okAsync, errAsync } = require("neverthrow")

const { config } = require("@config/config")

const { decryptPassword } = require("@root/utils/crypto-utils")

class SettingsService {
  constructor({
    configYmlService,
    footerYmlService,
    navYmlService,
    homepagePageService,
    sitesService,
    deploymentsService,
    gitHubService,
  }) {
    this.configYmlService = configYmlService
    this.footerYmlService = footerYmlService
    this.navYmlService = navYmlService
    this.homepagePageService = homepagePageService
    this.sitesService = sitesService
    this.deploymentsService = deploymentsService
    this.gitHubService = gitHubService
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

  async getPassword(sessionData) {
    const { siteName } = sessionData
    const siteInfo = await this.sitesService.getBySiteName(siteName)
    if (siteInfo.isErr()) {
      // Missing site indicating netlify site - return special result
      return okAsync({
        password: "",
        isAmplifySite: false,
      })
    }
    const { id, isPrivate } = siteInfo.value
    if (!isPrivate)
      return okAsync({
        password: "",
        isAmplifySite: true,
      })

    const deploymentInfo = await this.deploymentsService.getDeploymentInfoFromSiteId(
      id
    )
    if (deploymentInfo.isErr()) return deploymentInfo

    const password = decryptPassword(
      deploymentInfo.value.encryptedPassword,
      deploymentInfo.value.encryptionIv,
      config.get("aws.amplify.passwordSecretKey")
    )
    return okAsync({
      password,
      isAmplifySite: true,
    })
  }

  async updateSettingsFiles(
    sessionData,
    {
      config,
      homepage,
      footer,
      navigation,
      updatedConfigContent,
      updatedFooterContent,
      updatedNavigationContent,
    }
  ) {
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

  async updatePassword(sessionData, { password, enablePassword }) {
    const { siteName } = sessionData
    const siteInfo = await this.sitesService.getBySiteName(siteName)
    if (siteInfo.isErr()) {
      return siteInfo
    }
    const { id, isPrivate } = siteInfo.value
    if (!isPrivate && !enablePassword) return okAsync("")
    if (isPrivate !== enablePassword) {
      // For public -> private or private -> public, we also need to update the repo privacy on github
      const privatiseRepoRes = await this.gitHubService.changeRepoPrivacy(
        sessionData,
        enablePassword
      )
      if (privatiseRepoRes.isErr()) return privatiseRepoRes
      try {
        await this.sitesService.update({
          id,
          isPrivate: enablePassword,
        })
      } catch (err) {
        return errAsync(err)
      }
    }
    return this.deploymentsService.updateAmplifyPassword(
      siteName,
      password,
      enablePassword
    )
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

  cloneDeepNonEmpty(originalObj, updatedObj) {
    const clonedOriginalObj = originalObj ? { ...originalObj } : {}
    Object.keys(updatedObj).forEach((field) => {
      if (typeof updatedObj[field] === "object" && updatedObj[field] !== null) {
        clonedOriginalObj[field] = this.cloneDeepNonEmpty(
          originalObj[field],
          updatedObj[field]
        )
      } else if (updatedObj[field] === "") {
        // Check for empty string because false value exists
        delete clonedOriginalObj[field]
      } else {
        clonedOriginalObj[field] = updatedObj[field]
      }
    })
    return clonedOriginalObj
  }

  mergeUpdatedFooterData(currentData, updatedData) {
    // Special configuration to remove empty footer settings entirely so they don't show up in the actual site
    // Any updated data with empty strings are to be deleted from the footer object
    return this.cloneDeepNonEmpty(currentData, updatedData)
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
      google_analytics_ga4: config.content.google_analytics_ga4,
      linkedin_insights: config.content["linkedin-insights"],
      colors: config.content.colors,
    }
  }

  static extractFooterFields(footer) {
    return {
      show_reach: footer.content.show_reach,
      social_media: footer.content.social_media,
      faq: footer.content.faq,
      contact_us: footer.content.contact_us,
      feedback: footer.content.feedback,
    }
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
      "google_analytics_ga4",
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
