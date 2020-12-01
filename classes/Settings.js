const { Base64 } = require('js-base64')
const _ = require('lodash')
const yaml = require('js-yaml')
const Bluebird = require('bluebird')

// import classes
const { Config } = require('../classes/Config.js')
const { File, DataType } = require('../classes/File.js')

// Constants
const FOOTER_PATH = 'footer.yml'
const NAVIGATION_PATH = 'navigation.yml'

const retrieveSettingsFiles = async (accessToken, siteName) => {
  const configResp = new Config(accessToken, siteName)

  const FooterFile = new File(accessToken, siteName)
  const dataType = new DataType()
  FooterFile.setFileType(dataType)

  const NavigationFile = new File(accessToken, siteName)
  NavigationFile.setFileType(dataType)

  const fileRetrievalArr = [configResp.read(), FooterFile.read(FOOTER_PATH), NavigationFile.read(NAVIGATION_PATH)]

  const fileContentsArr = await Bluebird.map(fileRetrievalArr, async (fileOp) => {
    const { content, sha } = await fileOp
    return { content: yaml.safeLoad(Base64.decode(content)), sha}
  })

  return {
    configResp,
    FooterFile,
    NavigationFile,
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
      fileContentsArr,
    } = await retrieveSettingsFiles(this.accessToken, this.siteName)

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
        retrievedData: configContent,
      },
      {
        payload: footerSettings,
        retrievedData: footerContent,
      },
      {
        payload: navigationSettings,
        retrievedData: navigationContent,
      },
    ]

    const updatedSettingsObjArr = settingsObjArr.map(({ payload, retrievedData}) => {
      const settingsObj = _.cloneDeep(payload);
      Object.keys(retrievedData).forEach((setting) => (settingsObj[setting] = payload[setting]));
      console.log(settingsObj)
      return Base64.encode(yaml.safeDump(settingsObj))
    })

    // update files
    const newConfigContent = updatedSettingsObjArr[0]
    const newFooterContent = updatedSettingsObjArr[1]
    const newNavigationContent = updatedSettingsObjArr[2]

    await configResp.update(newConfigContent, fileContentsArr[0].sha)
    await FooterFile.update(FOOTER_PATH, newFooterContent, fileContentsArr[1].sha)
    await NavigationFile.update(NAVIGATION_PATH, newNavigationContent, fileContentsArr[2].sha)
    return
  }
}

module.exports = { Settings }