const { Base64 } = require('js-base64')
const _ = require('lodash')
const yaml = require('js-yaml')
const Bluebird = require('bluebird')

// import classes
const { Config } = require('../classes/Config.js')
const { File, DataType, HomepageType } = require('../classes/File.js')

// Constants
const FOOTER_PATH = 'footer.yml'
const NAVIGATION_PATH = 'navigation.yml'
const HOMEPAGE_INDEX_PATH = 'index.md' // Empty string

const retrieveSettingsFiles = async (accessToken, siteName, shouldRetrieveHomepage) => {
  const configResp = new Config(accessToken, siteName)

  const FooterFile = new File(accessToken, siteName)
  const dataType = new DataType()
  FooterFile.setFileType(dataType)

  const NavigationFile = new File(accessToken, siteName)
  NavigationFile.setFileType(dataType)

  const HomepageFile = new File(accessToken, siteName)
  const homepageType = new HomepageType()
  HomepageFile.setFileType(homepageType)

  const fileRetrievalArr = [configResp.read(), FooterFile.read(FOOTER_PATH), NavigationFile.read(NAVIGATION_PATH)]

  // Retrieve homepage only if flag is set to true
  if (shouldRetrieveHomepage) {
    fileRetrievalArr.push(HomepageFile.read(HOMEPAGE_INDEX_PATH))
  }

  const fileContentsArr = await Bluebird.map(fileRetrievalArr, async (fileOp, idx) => {
    const { content, sha } = await fileOp

    if (idx < 3) {
      return { content: yaml.safeLoad(Base64.decode(content)), sha}
    }

    // homepage requires special extraction as the content is wrapped in front matter
    if (idx === 3) {
      const homepageContent = Base64.decode(content)
      const homepageFrontMatterObj = yaml.safeLoad(homepageContent.split('---')[1])
      return { content: homepageFrontMatterObj, sha }
    }
  })

  return {
    configResp,
    FooterFile,
    NavigationFile,
    HomepageFile,
    fileContentsArr,
  }
}

class Settings {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async get() {
    const { fileContentsArr } = await retrieveSettingsFiles(this.accessToken, this.siteName)

    // convert data to object form
    const configContent = fileContentsArr[0].content
    const footerContent = fileContentsArr[1].content
    const navigationContent = fileContentsArr[2].content

    // retrieve only the relevant config and index fields
    const configFieldsRequired = {
      url: configContent.url,
      title: configContent.title,
      favicon: configContent.favicon,
      shareicon: configContent.shareicon,
      is_government: configContent.is_government,
      facebook_pixel: configContent['facebook-pixel'],
      google_analytics: configContent.google_analytics,
      resources_name: configContent.resources_name,
      colors: configContent.colors,
    }

    // retrieve footer sha since we are sending the footer object wholesale
    const footerSha = fileContentsArr[1].sha

    return ({
      configFieldsRequired,
      footerContent,
      navigationContent: { logo: navigationContent.logo },
      footerSha,
    })
  }
  
  async post(payload) {
    const {
      configResp,
      FooterFile,
      NavigationFile,
      HomepageFile,
      fileContentsArr,
    } = await retrieveSettingsFiles(this.accessToken, this.siteName, true)

    // extract data
    const {
      footerSettings,
      configSettings,
      navigationSettings,
    } = payload

    // update settings objects
    const configContent = fileContentsArr[0].content
    const footerContent = fileContentsArr[1].content
    const navigationContent = fileContentsArr[2].content

    const settingsObjArr = [
      {
        payload: configSettings,
        currentData: configContent,
      },
      {
        payload: footerSettings,
        currentData: footerContent,
      },
      {
        payload: navigationSettings,
        currentData: navigationContent,
      },
    ]

    const updatedSettingsObjArr = settingsObjArr.map(({ payload, currentData}) => {
      const settingsObj = _.cloneDeep(currentData);
      Object.keys(payload).forEach((setting) => (settingsObj[setting] = payload[setting]));
      return settingsObj
    })

    // update files
    const newConfigContent = Base64.encode(yaml.safeDump(updatedSettingsObjArr[0]))
    const newFooterContent = Base64.encode(yaml.safeDump(updatedSettingsObjArr[1]))
    const newNavigationContent = Base64.encode(yaml.safeDump(updatedSettingsObjArr[2]))

    // To-do: use Git Tree to speed up operations
    await configResp.update(newConfigContent, fileContentsArr[0].sha)
    await FooterFile.update(FOOTER_PATH, newFooterContent, fileContentsArr[1].sha)
    await NavigationFile.update(NAVIGATION_PATH, newNavigationContent, fileContentsArr[2].sha)

    // Update title in homepage as well if it's changed
    if (configContent.title !== updatedSettingsObjArr[0].title) {
      const { content: homepageContentObj, sha } = fileContentsArr[3];
      homepageContentObj.title = configSettings.title;
      const homepageFrontMatter = yaml.safeDump(homepageContentObj);

      const homepageContent = ['---\n', homepageFrontMatter, '---'].join('') ;
      const newHomepageContent = Base64.encode(homepageContent)

      await HomepageFile.update(HOMEPAGE_INDEX_PATH, newHomepageContent, sha)
    }
    return
  }
}

module.exports = { Settings }