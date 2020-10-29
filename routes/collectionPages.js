const express = require('express');
const router = express.Router();

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import classes 
const { File, CollectionPageType } = require('../classes/File.js');
const { update } = require('lodash');

// List pages in collection
async function listCollectionPages(req, res, next) {
  const { accessToken } = req
  const { siteName, collectionName } = req.params

  // TO-DO: Verify that collection exists

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  const collectionPages = await IsomerFile.list()

  res.status(200).json({ collectionPages })
}

// Create new page in collection
async function createNewcollectionPage (req, res, next) {
  const { accessToken } = req

  const { siteName, collectionName } = req.params
  const { pageName, content } = req.body

  // TO-DO:
  // Validate that collection exists
  // Validate pageName and content

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  const { sha } = await IsomerFile.create(pageName, content)

  res.status(200).json({ collectionName, pageName, content, sha })
}

// Read page in collection
async function readCollectionPage(req, res, next) {
  const { accessToken } = req

  const { siteName, pageName, collectionName } = req.params

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  const { sha, content } = await IsomerFile.read(pageName)

  // TO-DO:
  // Validate content

  res.status(200).json({ collectionName, pageName, sha, content })
}

// Update page in collection
async function updateCollectionPage (req, res, next) {
  const { accessToken } = req

  const { siteName, pageName, collectionName } = req.params
  const { content, sha } = req.body

  // TO-DO:
  // Validate pageName and content

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  const { newSha } = await IsomerFile.update(pageName, content, sha)

  res.status(200).json({ collectionName, pageName, content, sha: newSha })
}

// Delete page in collection
async function deleteCollectionPage (req, res, next) {
  const { accessToken } = req

  const { siteName, pageName, collectionName } = req.params
  const { sha } = req.body

  // TO-DO:
  // Validate that collection exists

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  await IsomerFile.delete(pageName, sha)

  res.status(200).send('OK')
}

// Rename page in collection
async function renameCollectionPage (req, res, next) {
  const { accessToken } = req

  const { siteName, pageName, collectionName, newPageName } = req.params
  const { sha, content } = req.body

  // TO-DO:
  // Validate that collection exists
  // Validate pageName and content

  // Create new collection page with name ${newPageName}

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  const { sha: newSha } = await IsomerFile.create(newPageName, content)
  await IsomerFile.delete(pageName, sha)

  res.status(200).json({ collectionName, pageName: newPageName, content, sha: newSha })
}

router.get('/:siteName/collections/:collectionName', attachRouteHandlerWrapper(listCollectionPages))
router.post('/:siteName/collections/:collectionName/pages', attachRouteHandlerWrapper(createNewcollectionPage))
router.get('/:siteName/collections/:collectionName/pages/:pageName', attachRouteHandlerWrapper(readCollectionPage))
router.post('/:siteName/collections/:collectionName/pages/:pageName', attachRouteHandlerWrapper(updateCollectionPage))
router.delete('/:siteName/collections/:collectionName/pages/:pageName', attachRouteHandlerWrapper(deleteCollectionPage))
router.post('/:siteName/collections/:collectionName/pages/:pageName/rename/:newPageName', attachRouteHandlerWrapper(renameCollectionPage))

module.exports = router;