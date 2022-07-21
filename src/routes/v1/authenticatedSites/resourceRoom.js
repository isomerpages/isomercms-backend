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
  const { sessionData } = res.locals
  const { siteName } = req.params
  const accessToken = sessionData.getAccessToken()

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  const resourceRoom = await IsomerResourceRoom.get()

  return res.status(200).json({ resourceRoom })
}

// Create resource room
async function createResourceRoom(req, res) {
  const { sessionData } = res.locals
  const { siteName } = req.params
  const { resourceRoom } = req.body
  const accessToken = sessionData.getAccessToken()

  // TO-DO:
  // Validate resourceRoom

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  await IsomerResourceRoom.create(resourceRoom)

  return res.status(200).json({ resourceRoom })
}

// Rename resource room name
async function renameResourceRoom(req, res) {
  const { sessionData } = res.locals
  const { siteName, resourceRoom } = req.params
  const accessToken = sessionData.getAccessToken()

  // TO-DO:
  // Validate resourceRoom

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  await IsomerResourceRoom.rename(resourceRoom)

  return res.status(200).json({ resourceRoom })
}

// Delete resource room
async function deleteResourceRoom(req, res) {
  const { sessionData } = res.locals
  const { siteName } = req.params
  const accessToken = sessionData.getAccessToken()

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  await IsomerResourceRoom.delete()

  return res.status(200).send("OK")
}

router.get("/", attachReadRouteHandlerWrapper(getResourceRoomName))
router.post("/", attachRollbackRouteHandlerWrapper(createResourceRoom))
router.post(
  "/:resourceRoom",
  attachRollbackRouteHandlerWrapper(renameResourceRoom)
)
router.delete("/", attachRollbackRouteHandlerWrapper(deleteResourceRoom))

module.exports = router
