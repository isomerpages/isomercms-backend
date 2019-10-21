const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import classes 
const { ResourceRoom } = require('../classes/ResourceRoom.js')

// Get resource room name
router.get('/:siteName/resource-room', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const IsomerResourceRoom = new ResourceRoom(access_token, siteName)
    const resourceRoom = await IsomerResourceRoom.get()

    res.status(200).json({ resourceRoom })
  } catch (err) {
    console.log(err)
  }
})

// Create resource room
router.post('/:siteName/resource-room', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params
    const { resourceRoom } = req.body

    // TO-DO:
    // Validate resourceRoom

    const IsomerResourceRoom = new ResourceRoom(access_token, siteName)
    await IsomerResourceRoom.create(resourceRoom)

    res.status(200).json({ resourceRoom })
  } catch (err) {
    console.log(err)
  }
})

// Rename resource room name
router.post('/:siteName/resource-room/:resourceRoom', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName, resourceRoom } = req.params

    // TO-DO:
    // Validate resourceRoom

    const IsomerResourceRoom = new ResourceRoom(access_token, siteName)
    await IsomerResourceRoom.rename(resourceRoom)

    res.status(200).json({ resourceRoom })
  } catch (err) {
    console.log(err)
  }
})

// Delete resource room
router.delete('/:siteName/resource-room', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const IsomerResourceRoom = new ResourceRoom(access_token, siteName)
    await IsomerResourceRoom.delete()

    res.status(200).send('OK')
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;