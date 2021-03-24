const express = require('express');
const router = express.Router();

// Import middleware
const { attachReadRouteHandlerWrapper, attachRollbackRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import classes 
const { ResourceRoom } = require('../classes/ResourceRoom.js')
const { Resource } = require('../classes/Resource.js')
const { File, ResourcePageType } = require('../classes/File');

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
  await IsomerResource.rename(resourceRoomName, resourceName, newResourceName)

  res.status(200).json({ resourceName, newResourceName })
}

// Move resource
async function moveResource (req, res, next) {
  const { accessToken } = req
  const { siteName, resourceName, newResourceName } = req.params
  const { fileName } = req.body

  const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()

  const IsomerResource = new Resource(accessToken, siteName)
  const resources = await IsomerResource.list(resourceRoomName)
  const resourceCategories = resources.map(resource => resource.dirName)
  if (!resourceCategories.includes(resourceName)) throw new NotFoundError(`Resource category ${resourceName} was not found!`)
  if (!resourceCategories.includes(newResourceName)) throw new NotFoundError(`Resource category ${newResourceName} was not found!`)

  const oldIsomerFile = new File(accessToken, siteName)
  const newIsomerFile = new File(accessToken, siteName)
  const oldResourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  const newResourcePageType = new ResourcePageType(resourceRoomName, newResourceName)
  oldIsomerFile.setFileType(oldResourcePageType)
  newIsomerFile.setFileType(newResourcePageType)

  const { content, sha } = await oldIsomerFile.read(fileName)
  await oldIsomerFile.delete(fileName, sha)
  await newIsomerFile.create(fileName, content)

  res.status(200).send('OK')
}

router.get('/:siteName/resources', attachReadRouteHandlerWrapper(listResources))
router.post('/:siteName/resources', attachRollbackRouteHandlerWrapper(createNewResource))
router.delete('/:siteName/resources/:resourceName', attachRollbackRouteHandlerWrapper(deleteResource))
router.post('/:siteName/resources/:resourceName/rename/:newResourceName', attachRollbackRouteHandlerWrapper(renameResource))
router.post('/:siteName/resources/:resourceName/move/:newResourceName', attachRollbackRouteHandlerWrapper(moveResource))

module.exports = router;