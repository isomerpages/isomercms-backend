import { statsMiddleware } from "@root/middleware/stats"

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
  const { userWithSiteSessionData } = res.locals
  const { siteName } = req.params
  const { accessToken } = userWithSiteSessionData

  const settingsFile = new Settings(accessToken, siteName)
  const settings = await settingsFile.get()
  return res.status(200).json({ settings })
}

async function updateSettings(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName } = req.params
  const { accessToken } = userWithSiteSessionData

  const settings = new Settings(accessToken, siteName)
  await settings.post(req.body)
  return res.status(200).send("OK")
}

router.get(
  "/",
  statsMiddleware.logVersionNumberCallFor(1, "getSettings"),
  attachReadRouteHandlerWrapper(getSettings)
)
router.post(
  "/",
  statsMiddleware.logVersionNumberCallFor(1, "updateSettings"),
  attachRollbackRouteHandlerWrapper(updateSettings)
)

module.exports = router
