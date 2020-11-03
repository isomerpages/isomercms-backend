const express = require('express');
const router = express.Router();

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import Classes
const { Settings } = require('../classes/Settings.js')

async function getSettings(req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params

  const settingsFile = new Settings(accessToken, siteName)
  const settings = await settingsFile.get()
  res.status(200).json({ settings })
}

async function updateSettings (req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params

  const settings = new Settings(accessToken, siteName)
  await settings.post(req.body)
  res.status(200).send('OK')
}

router.get('/:siteName/settings', attachRouteHandlerWrapper(getSettings))
router.post('/:siteName/settings', attachRouteHandlerWrapper(updateSettings))

module.exports = router;
