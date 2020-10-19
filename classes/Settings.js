const { Base64 } = require('js-base64')
const yaml = require('js-yaml')
const Bluebird = require('bluebird')

// import classes
const { Config } = require('../classes/Config.js')
const { File, DataType } = require('../classes/File.js')

// Constants
const FOOTER_PATH = 'footer.yml'

class Settings {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async get() {
    try {
      // retrieve _config.yml and footer.yml
      const configResp = new Config(this.accessToken, this.siteName)

      const IsomerDataFile = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      IsomerDataFile.setFileType(dataType)

      const fileRetrievalArr = [configResp.read(), IsomerDataFile.read(FOOTER_PATH)]

      const fileContentsArr = await Bluebird.map(fileRetrievalArr, async (fileOp) => {
        const { content, sha } = await fileOp
        return { content, sha}
      })

      // convert data to object form
      const configContent = fileContentsArr[0].content
      const footerContent = fileContentsArr[1].content

      const configReadableContent = yaml.safeLoad(Base64.decode(configContent));
      const footerReadableContent = yaml.safeLoad(Base64.decode(footerContent));

      // retrieve only the relevant config and index fields
      const configFieldsRequired = {
        url: configReadableContent.url,
        title: configReadableContent.title,
        favicon: configReadableContent.favicon,
        resources_name: configReadableContent.resources_name,
        colors: configReadableContent.colors,
      }

      // retrieve footer sha since we are sending the footer object wholesale
      const footerSha = fileContentsArr[1].sha

      return ({ configFieldsRequired, footerContent: footerReadableContent, footerSha })
    } catch (err) {
      console.log(err)
    }
  }
  
  async post(payload) {
    try {
      // setup 
      const configResp = new Config(this.accessToken, this.siteName)
      const config = await configResp.read()
      const IsomerDataFile = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      IsomerDataFile.setFileType(dataType)

      // extract data
      const {
        footerSettings,
        configSettings,
        footerSha,
      } = payload

      // update config object
      const configContent = yaml.safeLoad(Base64.decode(config.content));
      Object.keys(configSettings).forEach((setting) => (configContent[setting] = configSettings[setting]));

      // update files
      const newConfigContent = Base64.encode(yaml.safeDump(configContent))
      const newFooterContent = Base64.encode(yaml.safeDump(footerSettings))
      await configResp.update(newConfigContent, config.sha)
      await IsomerDataFile.update(FOOTER_PATH, newFooterContent, footerSha)
      return
    } catch (err) {
      console.log(err)
    }
  }
}

module.exports = { Settings }