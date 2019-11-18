const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import classes 
const { ResourceRoom } = require('../classes/ResourceRoom.js')
const { Resource } = require('../classes/Resource.js')

// List resources
router.get('/:siteName/resources', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const IsomerResourceRoom = new ResourceRoom(access_token, siteName)
    const resourceRoomName = await IsomerResourceRoom.get()

    const IsomerResource = new Resource(access_token, siteName)
    const resources = await IsomerResource.list(resourceRoomName)

    res.status(200).json({ resourceRoomName, resources })
  } catch (err) {
    console.log(err)
  }
})

// Create new resource
router.post('/:siteName/resources', async function(req, res, next) {
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
})

// Delete resource
router.delete('/:siteName/resources/:resourceName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName, resourceName } = req.params

    const IsomerResourceRoom = new ResourceRoom(access_token, siteName)
    const resourceRoomName = await IsomerResourceRoom.get()

    const IsomerResource = new Resource(access_token, siteName)
    await IsomerResource.delete(resourceRoomName, resourceName)

    res.status(200).send('OK')
  } catch (err) {
    console.log(err)
  }
})

// Rename resource
router.post('/:siteName/resources/:resourceName/rename/:newResourceName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName, resourceName, newResourceName } = req.params

    const IsomerResourceRoom = new ResourceRoom(access_token, siteName)
    const resourceRoomName = await IsomerResourceRoom.get()

    const IsomerResource = new Resource(access_token, siteName)
    await IsomerResource.rename(resourceRoomName, resourceName, resourceRoomName, newResourceName)

    res.status(200).json({ resourceName, newResourceName })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;