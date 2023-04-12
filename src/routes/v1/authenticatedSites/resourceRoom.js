import { statsMiddleware } from "@root/middleware/stats"

const express = require("express")

const router = express.Router({ mergeParams: true })

// Import classes
const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const { ResourceRoom } = require("@classes/ResourceRoom")

// Get resource room name
async function getResourceRoomName(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName } = req.params
  const { accessToken } = userWithSiteSessionData

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  const resourceRoom = await IsomerResourceRoom.get()

  return res.status(200).json({ resourceRoom })
}

// Create resource room
async function createResourceRoom(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName } = req.params
  const { resourceRoom } = req.body
  const { accessToken } = userWithSiteSessionData

  // TO-DO:
  // Validate resourceRoom

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  await IsomerResourceRoom.create(resourceRoom)

  return res.status(200).json({ resourceRoom })
}

// Rename resource room name
async function renameResourceRoom(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName, resourceRoom } = req.params
  const { accessToken } = userWithSiteSessionData

  // TO-DO:
  // Validate resourceRoom

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  await IsomerResourceRoom.rename(resourceRoom)

  return res.status(200).json({ resourceRoom })
}

// Delete resource room
async function deleteResourceRoom(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName } = req.params
  const { accessToken } = userWithSiteSessionData

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  await IsomerResourceRoom.delete()

  return res.status(200).send("OK")
}

router.get(
  "/",
  statsMiddleware.logVersionNumberCallFor(1, "getResourceRoomName"),
  attachReadRouteHandlerWrapper(getResourceRoomName)
)
router.post(
  "/",
  statsMiddleware.logVersionNumberCallFor(1, "createResourceRoom"),
  attachRollbackRouteHandlerWrapper(createResourceRoom)
)
router.post(
  "/:resourceRoom",
  statsMiddleware.logVersionNumberCallFor(1, "renameResourceRoom"),
  attachRollbackRouteHandlerWrapper(renameResourceRoom)
)
router.delete(
  "/",
  statsMiddleware.logVersionNumberCallFor(1, "deleteResourceRoom"),
  attachRollbackRouteHandlerWrapper(deleteResourceRoom)
)

module.exports = router
