const express = require('express');
const router = express.Router();
const _ = require('lodash')
const jwtUtils = require('../utils/jwt-utils')

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import Classes
const { Settings } = require('../classes/Settings.js')

async function getSettings(req, res, next) {
  const { oauthtoken } = req.cookies
  let { access_token } = jwtUtils.verifyToken(oauthtoken)
  const { siteName } = req.params

  const settingsFile = new Settings(access_token, siteName)
  const settings = await settingsFile.get()
  res.status(200).json({ settings })
}

async function updateSettings (req, res, next) {
  const { oauthtoken } = req.cookies
  let { access_token } = jwtUtils.verifyToken(oauthtoken)
  const { siteName } = req.params

  const settings = new Settings(access_token, siteName)
  await settings.post(req.body)
  res.status(200).send('OK')
}

router.get('/:siteName/settings', attachRouteHandlerWrapper(getSettings))
router.post('/:siteName/settings', attachRouteHandlerWrapper(updateSettings))

module.exports = router;
