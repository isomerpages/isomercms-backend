const express = require('express');
const router = express.Router();
const _ = require('lodash')
const jwtUtils = require('../utils/jwt-utils')

// Import Classes
const { Settings } = require('../classes/Settings.js')

router.get('/:siteName/settings', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    let { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const settingsFile = new Settings(access_token, siteName)
    const settings = await settingsFile.get()
    res.status(200).json({ settings })
  } catch (err) {
    console.log(err)
  }
})

router.post('/:siteName/settings', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    let { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const settings = new Settings(access_token, siteName)
    await settings.post(req.body)
    res.status(200).send('OK')
  } catch (err) {
    console.log(err)
  }
})


module.exports = router;
