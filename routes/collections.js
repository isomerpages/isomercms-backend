const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import classes 
const { Collection } = require('../classes/Collection.js')

// List collections
router.get('/:siteName/collections', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const GitHubCollection = new Collection(access_token, siteName)
    const collections = await GitHubCollection.list()

    res.status(200).json({ collections })

  } catch (err) {
    console.log(err)
  }
})

// Create new collection
router.post('/:siteName/collections', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params
    const { collectionName } = req.body

    const GitHubCollection = new Collection(access_token, siteName)
    await GitHubCollection.create(collectionName)

  } catch (err) {
    console.log(err)
  }
})

// Delete collection
router.delete('/:siteName/collections/:collectionName', async function(req, res, next) {
  try {
    // TO-DO: Verify that collection exists

    // Remove collection from config file
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName, collectionName } = req.params

    const GitHubCollection = new Collection(access_token, siteName)
    await GitHubCollection.delete(collectionName)

  } catch (err) {
    console.log(err)
  }
})

// Rename collection
router.post('/:siteName/collections/:collectionName/rename/:newCollectionName', async function(req, res, next) {
  try {
    // TO-DO: Verify that collection exists

    // Remove collection from config file
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName, collectionName, newCollectionName } = req.params

    const GitHubCollection = new Collection(access_token, siteName)
    await GitHubCollection.rename(collectionName, newCollectionName)
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;