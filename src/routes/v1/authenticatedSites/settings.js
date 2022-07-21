const express = require("express")

const router = express.Router({ mergeParams: true })

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import Classes
const { Settings } = require("@classes/Settings")

async function getSettings(req, res) {
  const { sessionData } = res.locals
  const { siteName } = req.params
  const accessToken = sessionData.getAccessToken()

  const settingsFile = new Settings(accessToken, siteName)
  const settings = await settingsFile.get()
  return res.status(200).json({ settings })
}

async function updateSettings(req, res) {
  const { sessionData } = res.locals
  const { siteName } = req.params
  const accessToken = sessionData.getAccessToken()

  const settings = new Settings(accessToken, siteName)
  await settings.post(req.body)
  return res.status(200).send("OK")
}

router.get("/", attachReadRouteHandlerWrapper(getSettings))
router.post("/", attachRollbackRouteHandlerWrapper(updateSettings))

module.exports = router
