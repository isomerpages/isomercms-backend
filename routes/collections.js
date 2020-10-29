const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import classes 
const { Collection } = require('../classes/Collection.js')

// List collections
async function listCollections (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)
  const { siteName } = req.params

  const IsomerCollection = new Collection(access_token, siteName)
  const collections = await IsomerCollection.list()

  res.status(200).json({ collections })
}

// Create new collection
async function createNewCollection(req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)
  const { siteName } = req.params
  const { collectionName } = req.body

  const IsomerCollection = new Collection(access_token, siteName)
  await IsomerCollection.create(collectionName)

  res.status(200).json({ collectionName })
}

// Delete collection
async function deleteCollection (req, res, next) {
  // TO-DO: Verify that collection exists

  // Remove collection from config file
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)
  const { siteName, collectionName } = req.params

  const IsomerCollection = new Collection(access_token, siteName)
  await IsomerCollection.delete(collectionName)

  res.status(200).json({ collectionName })
}

// Rename collection
async function renameCollection (req, res, next) {
  // TO-DO: Verify that collection exists

  // Remove collection from config file
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)
  const { siteName, collectionName, newCollectionName } = req.params

  const IsomerCollection = new Collection(access_token, siteName)
  await IsomerCollection.rename(collectionName, newCollectionName)

  res.status(200).json({ collectionName, newCollectionName })
}

router.get('/:siteName/collections', attachRouteHandlerWrapper(listCollections))
router.post('/:siteName/collections', attachRouteHandlerWrapper(createNewCollection))
router.delete('/:siteName/collections/:collectionName', attachRouteHandlerWrapper(deleteCollection))
router.post('/:siteName/collections/:collectionName/rename/:newCollectionName', attachRouteHandlerWrapper(renameCollection))

module.exports = router;