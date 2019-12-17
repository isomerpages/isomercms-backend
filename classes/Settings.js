const { Base64 } = require('js-base64')
const yaml = require('js-yaml')

// import classes
const { Config } = require('../classes/Config.js')
const { File, DataType } = require('../classes/File.js')

class Settings {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async get() {
    try {
      // retrieve _config.yml and social-media.yml
    	const configResp = new Config(this.accessToken, this.siteName)
      const IsomerDataFile = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      IsomerDataFile.setFileType(dataType)

      const { content: config, sha: configSha } = await configResp.read()
      const socialMediaResp = IsomerDataFile.read('social-media.yml').catch((err) => {
        // social-media.yml doesn't exist so we create a social-media.yml
        const content = {
          facebook: '',
          linkedin: '',
          twitter: '',
          youtube: '',
          instagram: '',
        }
        const socialMediaYml = Base64.encode(yaml.safeDump(content))
        const { sha } = IsomerDataFile.create('social-media.yml', socialMediaYml)
        return { content, sha }
      })
      const { content: socialMedia, sha: socialMediaSha } = await socialMediaResp

      // convert data to object form
      const configContent = yaml.safeLoad(Base64.decode(config));
      const socialMediaContent = yaml.safeLoad(Base64.decode(socialMedia));

      // retrieve only the relevant config fields
      const configFieldsRequired = {
        title: configContent.title,
        favicon: configContent.favicon,
        resources_name: configContent.resources_name,
        colors: configContent.colors,

      }

      return ({ configFieldsRequired, socialMediaContent, configSha, socialMediaSha })
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
        socialMediaSettings,
        configSettings,
        socialMediaSha,
        configSha,
      } = payload

      // update config and social media objects
      const configContent = yaml.safeLoad(Base64.decode(config.content));
      Object.keys(configSettings).forEach((setting) => (configContent[setting] = configSettings[setting]));

      // update files
      const newConfigContent = Base64.encode(yaml.safeDump(configContent))
      const newSocialMediaContent = Base64.encode(yaml.safeDump(socialMediaSettings))
      await configResp.update(newConfigContent, configSha)
      await IsomerDataFile.update('social-media.yml', newSocialMediaContent, socialMediaSha)
      return
    } catch (err) {
      console.log(err)
    }
  }
}

module.exports = { Settings }