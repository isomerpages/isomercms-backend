const { Base64 } = require('js-base64')
const yaml = require('js-yaml')
const Bluebird = require('bluebird')

// import classes
const { Config } = require('../classes/Config.js')
const { File, DataType } = require('../classes/File.js')

// Constants
const FOOTER_PATH = 'footer.yml'
const NAVIGATION_PATH = 'navigation.yml'

class Settings {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async get() {
    // retrieve _config.yml and footer.yml
    const configResp = new Config(this.accessToken, this.siteName)

    const FooterFile = new File(this.accessToken, this.siteName)
    const dataType = new DataType()
    FooterFile.setFileType(dataType)

    const NavigationFile = new File(this.accessToken, this.siteName)
    NavigationFile.setFileType(dataType)

    const fileRetrievalArr = [configResp.read(), FooterFile.read(FOOTER_PATH), NavigationFile.read(NAVIGATION_PATH)]

    const fileContentsArr = await Bluebird.map(fileRetrievalArr, async (fileOp) => {
      const { content, sha } = await fileOp
      return { content, sha}
    })

    // convert data to object form
    const configContent = fileContentsArr[0].content
    const footerContent = fileContentsArr[1].content
    const navigationContent = fileContentsArr[2].content

    const configReadableContent = yaml.safeLoad(Base64.decode(configContent));
    const footerReadableContent = yaml.safeLoad(Base64.decode(footerContent));
    const navigationReadableContent = yaml.safeLoad(Base64.decode(navigationContent));

    // retrieve only the relevant config and index fields
    const configFieldsRequired = {
      url: configReadableContent.url,
      title: configReadableContent.title,
      favicon: configReadableContent.favicon,
      shareicon: configReadableContent.shareicon,
      facebook_pixel: configReadableContent['facebook-pixel'],
      google_analytics: configReadableContent.google_analytics,
      resources_name: configReadableContent.resources_name,
      colors: configReadableContent.colors,
    }

    // retrieve footer sha since we are sending the footer object wholesale
    const footerSha = fileContentsArr[1].sha

    return ({
      configFieldsRequired,
      footerContent: footerReadableContent,
      navigationContent: { logo: navigationReadableContent.logo },
      footerSha,
    })
  }
  
  async post(payload) {
    // setup 
    const configResp = new Config(this.accessToken, this.siteName)
    const config = await configResp.read()
    const FooterFile = new File(this.accessToken, this.siteName)
    const dataType = new DataType()
    FooterFile.setFileType(dataType)
    const NavigationFile = new File(this.accessToken, this.siteName)
    NavigationFile.setFileType(dataType)
    const navigation = await NavigationFile.read(NAVIGATION_PATH)

    // extract data
    const {
      footerSettings,
      configSettings,
      navigationSettings,
      footerSha,
    } = payload

    // update config object
    const configContent = yaml.safeLoad(Base64.decode(config.content));
    Object.keys(configSettings).forEach((setting) => (configContent[setting] = configSettings[setting]));

    // update navigation object
    const navigationContent = yaml.safeLoad(Base64.decode(navigation.content));
    Object.keys(navigationSettings).forEach((setting) => (navigationContent[setting] = navigationSettings[setting]))

    // update files
    const newConfigContent = Base64.encode(yaml.safeDump(configContent))
    const newFooterContent = Base64.encode(yaml.safeDump(footerSettings))
    const newNavigationContent = Base64.encode(yaml.safeDump(navigationContent))
    await configResp.update(newConfigContent, config.sha)
    await FooterFile.update(FOOTER_PATH, newFooterContent, footerSha)
    await NavigationFile.update(NAVIGATION_PATH, newNavigationContent, navigation.sha)
    return
  }
}

module.exports = { Settings }