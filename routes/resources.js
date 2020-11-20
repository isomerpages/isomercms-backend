const express = require('express');
const router = express.Router();

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import classes 
const { ResourceRoom } = require('../classes/ResourceRoom.js')
const { Resource } = require('../classes/Resource.js')

// List resources
async function listResources (req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await IsomerResourceRoom.get()

  const IsomerResource = new Resource(accessToken, siteName)
  const resources = await IsomerResource.list(resourceRoomName)

  res.status(200).json({ resourceRoomName, resources })
}

// Create new resource
async function createNewResource (req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params
  const { resourceName } = req.body

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await IsomerResourceRoom.get()

  const IsomerResource = new Resource(accessToken, siteName)
  await IsomerResource.create(resourceRoomName, resourceName)

  res.status(200).json({ resourceName })
}

// Delete resource
async function deleteResource (req, res, next) {
  const { accessToken } = req
  const { siteName, resourceName } = req.params

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await IsomerResourceRoom.get()

  const IsomerResource = new Resource(accessToken, siteName)
  await IsomerResource.delete(resourceRoomName, resourceName)

  res.status(200).send('OK')
}

// Rename resource
async function renameResource (req, res, next) {
  const { accessToken } = req
  const { siteName, resourceName, newResourceName } = req.params

  const IsomerResourceRoom = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await IsomerResourceRoom.get()

  const IsomerResource = new Resource(accessToken, siteName)
  await IsomerResource.rename(resourceRoomName, resourceName, resourceRoomName, newResourceName)

  res.status(200).json({ resourceName, newResourceName })
}

router.get('/:siteName/resources', attachRouteHandlerWrapper(listResources))
router.post('/:siteName/resources', attachRouteHandlerWrapper(createNewResource))
router.delete('/:siteName/resources/:resourceName', attachRouteHandlerWrapper(deleteResource))
router.post('/:siteName/resources/:resourceName/rename/:newResourceName', attachRouteHandlerWrapper(renameResource))

module.exports = router;