const express = require('express');
const router = express.Router();

// Import classes 
const { ResourceRoom } = require('../classes/ResourceRoom.js');
const { attachRouteHandlerWrapper, attachRollbackRouteHandlerWrapper } = require('../middleware/routeHandler');

// Get resource room name
async function getResourceRoomName (req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  const resourceRoom = await IsomerResourceRoom.get()

  res.status(200).json({ resourceRoom })
}

// Create resource room
async function createResourceRoom (req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params
  const { resourceRoom } = req.body

  // TO-DO:
  // Validate resourceRoom

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  await IsomerResourceRoom.create(resourceRoom)

  res.status(200).json({ resourceRoom })
}

// Rename resource room name
async function renameResourceRoom(req, res, next) {
  const { accessToken } = req
  const { siteName, resourceRoom } = req.params

  // TO-DO:
  // Validate resourceRoom

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  await IsomerResourceRoom.rename(resourceRoom)

  res.status(200).json({ resourceRoom })
}

// Delete resource room
async function deleteResourceRoom(req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  await IsomerResourceRoom.delete()

  res.status(200).send('OK')
}

router.get('/:siteName/resource-room', attachRouteHandlerWrapper(getResourceRoomName))
router.post('/:siteName/resource-room', attachRollbackRouteHandlerWrapper(createResourceRoom))
router.post('/:siteName/resource-room/:resourceRoom', attachRollbackRouteHandlerWrapper(renameResourceRoom))
router.delete('/:siteName/resource-room', attachRollbackRouteHandlerWrapper(deleteResourceRoom))

module.exports = router;