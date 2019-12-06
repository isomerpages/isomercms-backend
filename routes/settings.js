const express = require('express');
const router = express.Router();
const yaml = require('js-yaml')
const base64 = require('base-64')
const Bluebird = require('bluebird')
const _ = require('lodash')
const jwtUtils = require('../utils/jwt-utils')

// Import Classes
const { Config } = require('../classes/Config.js')
const { File, DataType } = require('../classes/File.js')

class Settings {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async get() {
    try {
      // retrieve _config.yml
    	const config = new Config(this.accessToken, this.siteName)
      
      // retrieve social-media.yml
      const IsomerDataFile = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      IsomerDataFile.setFileType(dataType)

      const configResp = await config.read()
      const socialMediaResp = await IsomerDataFile.read().catch(err => false)

      // extract content as objects
      const parsedConfigResp = yaml.safeLoad(base64.decode(configResp.content))
      const { title, favicon, resources_name, colors } = parsedConfigResp
      const configContent = {
        title,
        favicon,
        resources_name,
        colors,
      }

      let socialMediaContent
      if (socialMediaResp.status === 200) {
        socialMediaContent = yaml.safeLoad(base64.decode(socialMediaResp.content))
        socialMediaContent = {}
      } else if (!socialMediaResp) {
        socialMediaContent = {}
      }

      return ({ configContent, socialMediaContent })
      // res.status(200).json({ configContent, socialMediaContent, colorContent })

    } catch (err) {
      console.log(err)
    }
  }
}

router.get('/:siteName/settings', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    let { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params


    const abc = new Settings(access_token, "demo-v2")
    const settings = await abc.get()
    res.status(200).json({ settings })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;
