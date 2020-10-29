const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import classes 
const { ResourceRoom } = require('../classes/ResourceRoom.js')
const { Resource } = require('../classes/Resource.js')

// List resources
async function listResources (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)
  const { siteName } = req.params

  const IsomerResourceRoom = new ResourceRoom(access_token, siteName)
  const resourceRoomName = await IsomerResourceRoom.get()

  const IsomerResource = new Resource(access_token, siteName)
  const resources = await IsomerResource.list(resourceRoomName)

  res.status(200).json({ resourceRoomName, resources })
}

// Create new resource
async function createNewResource (req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params
    const { resourceName } = req.body

    const IsomerResourceRoom = new ResourceRoom(access_token, siteName)
    const resourceRoomName = await IsomerResourceRoom.get()

    const IsomerResource = new Resource(access_token, siteName)
    await IsomerResource.create(resourceRoomName, resourceName)

    res.status(200).json({ resourceName })
    // TO-DO
  } catch (err) {
    console.log(err)
  }
}

// Delete resource
async function deleteResource (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)
  const { siteName, resourceName } = req.params

  const IsomerResourceRoom = new ResourceRoom(access_token, siteName)
  const resourceRoomName = await IsomerResourceRoom.get()

  const IsomerResource = new Resource(access_token, siteName)
  await IsomerResource.delete(resourceRoomName, resourceName)

  res.status(200).send('OK')
}

// Rename resource
async function renameResource (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)
  const { siteName, resourceName, newResourceName } = req.params

  const IsomerResourceRoom = new ResourceRoom(access_token, siteName)
  const resourceRoomName = await IsomerResourceRoom.get()

  const IsomerResource = new Resource(access_token, siteName)
  await IsomerResource.rename(resourceRoomName, resourceName, resourceRoomName, newResourceName)

  res.status(200).json({ resourceName, newResourceName })
}

router.get('/:siteName/resources', attachRouteHandlerWrapper(listResources))
router.post('/:siteName/resources', attachRouteHandlerWrapper(createNewResource))
router.delete('/:siteName/resources/:resourceName', attachRouteHandlerWrapper(deleteResource))
router.post('/:siteName/resources/:resourceName/rename/:newResourceName', attachRouteHandlerWrapper(renameResource))

module.exports = router;