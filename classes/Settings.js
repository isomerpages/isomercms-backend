const base64 = require('base-64')
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
    	const config = new Config(this.accessToken, this.siteName)
      const IsomerDataFile = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      IsomerDataFile.setFileType(dataType)

      const { content: configResp, sha: configSha } = await config.read()
      const socialMedia = IsomerDataFile.read('social-media.yml').catch((err) => {
        // social-media.yml doesn't exist so we create a social-media.yml
        const content = {
          facebook: '',
          linkedin: '',
          twitter: '',
          youtube: '',
          instagram: '',
        }
        const socialMediaYml = base64.encode(yaml.safeDump(content))
        const { sha } = IsomerDataFile.create('social-media.yml', socialMediaYml)
        return { content, sha }
      })
      const { content: socialMediaResp, sha: socialMediaSha } = await socialMedia

      return ({ configResp, socialMediaResp, configSha, socialMediaSha })
    } catch (err) {
      console.log(err)
    }
  }
  
  async post(payload) {
    try {
      // setup 
    	const config = new Config(this.accessToken, this.siteName)
      const IsomerDataFile = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      IsomerDataFile.setFileType(dataType)

      // extract data
      const { configSettings, configSha, socialMediaSettings, socialMediaSha } = payload

      // update files
      const newConfigContent = base64.encode(yaml.safeDump(configSettings))
      const newSocialMediaContent = base64.encode(yaml.safeDump(socialMediaSettings))
      await config.update(newConfigContent, configSha)
      await IsomerDataFile.update('social-media.yml', newSocialMediaContent, socialMediaSha)
      return
    } catch (err) {
      console.log(err)
    }
  }
}

module.exports = { Settings }