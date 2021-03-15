const express = require('express');
const router = express.Router();
const Bluebird = require('bluebird')
const yaml = require('js-yaml');
const base64 = require('base-64');

// Import middleware
const { 
  attachReadRouteHandlerWrapper, 
  attachRollbackRouteHandlerWrapper 
} = require('../middleware/routeHandler')

// Import classes 
const { Collection } = require('../classes/Collection.js');
const { CollectionConfig } = require('../classes/Config.js');
const { File, CollectionPageType, PageType } = require('../classes/File');

const { deslugifyCollectionName } = require('../utils/utils')

// List collections
async function listCollections (req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params

  const IsomerCollection = new Collection(accessToken, siteName)
  const collections = await IsomerCollection.list()

  res.status(200).json({ collections })
}

// Create new collection
async function createNewCollection(req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params
  const { collectionName } = req.body

  const IsomerCollection = new Collection(accessToken, siteName)
  await IsomerCollection.create(collectionName)

  res.status(200).json({ collectionName })
}

// Delete collection
async function deleteCollection (req, res, next) {
  // TO-DO: Verify that collection exists

  // Remove collection from config file
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, collectionName } = req.params

  const IsomerCollection = new Collection(accessToken, siteName)
  await IsomerCollection.delete(collectionName, currentCommitSha, treeSha)

  res.status(200).json({ collectionName })
}

// Rename collection
async function renameCollection (req, res, next) {
  // TO-DO: Verify that collection exists

  // Remove collection from config file
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, collectionName, newCollectionName } = req.params

  const IsomerCollection = new Collection(accessToken, siteName)
  await IsomerCollection.rename(collectionName, newCollectionName, currentCommitSha, treeSha)

  res.status(200).json({ collectionName, newCollectionName })
}

// Move files in collection
async function moveFiles (req, res, next) {
  const { accessToken } = req
  const { siteName, collectionPath, targetPath } = req.params
  const { files } = req.body
  const processedCollectionPathTokens = decodeURIComponent(collectionPath).split('/')
  const collectionName = processedCollectionPathTokens[0]
  const collectionSubfolderName = processedCollectionPathTokens[1]
  const processedTargetPathTokens = decodeURIComponent(targetPath).split('/')
  const targetCollectionName = processedTargetPathTokens[0]
  const targetSubfolderName = processedTargetPathTokens[1]

  const IsomerCollection = new Collection(accessToken, siteName)
  const collections = await IsomerCollection.list()

  // Check if collection already exists
  if (!collections.includes(targetCollectionName) && targetCollectionName !== 'pages') {
    await IsomerCollection.create(targetCollectionName)
  }

  const oldIsomerFile = new File(accessToken, siteName)
  const newIsomerFile = new File(accessToken, siteName)
  const oldCollectionPageType = new CollectionPageType(decodeURIComponent(collectionPath))
  const newCollectionPageType = targetCollectionName === 'pages' ? new PageType() : new CollectionPageType(decodeURIComponent(targetPath))
  oldIsomerFile.setFileType(oldCollectionPageType)
  newIsomerFile.setFileType(newCollectionPageType)
  const oldConfig = new CollectionConfig(accessToken, siteName, collectionName)
  const newConfig = targetCollectionName === 'pages' ? null : new CollectionConfig(accessToken, siteName, targetCollectionName)

  // We can't perform these operations concurrently because of conflict issues
  for (const fileName of files) {
    const { content, sha } = await oldIsomerFile.read(fileName)
    await oldIsomerFile.delete(fileName, sha)
    if (targetSubfolderName || collectionSubfolderName) {
      // Modifying third nav in front matter, to be removed after template rewrite
      const frontMatter = yaml.safeLoad(base64.decode(content).split('---')[1])
      if (targetSubfolderName) frontMatter.third_nav_title = deslugifyCollectionName(targetSubfolderName)
      else delete frontMatter.third_nav_title
      const newFrontMatter = yaml.safeDump(frontMatter)
      const newContent = ['---\n', newFrontMatter, '---'].join('')
      const newEncodedContent = base64.encode(newContent)
      await newIsomerFile.create(fileName, newEncodedContent)
    } else {
      await newIsomerFile.create(fileName, content)
    }

    // Update collection.yml files
    await oldConfig.deleteItemFromOrder(`${collectionSubfolderName ? `${collectionSubfolderName}/` : ''}${fileName}`)
    if (newConfig) await newConfig.addItemToOrder(`${targetSubfolderName ? `${targetSubfolderName}/` : ''}${fileName}`)
  }

  res.status(200).send('OK')
}


router.get('/:siteName/collections', attachReadRouteHandlerWrapper(listCollections))
router.post('/:siteName/collections', attachRollbackRouteHandlerWrapper(createNewCollection))
router.delete('/:siteName/collections/:collectionName', attachRollbackRouteHandlerWrapper(deleteCollection))
router.post('/:siteName/collections/:collectionName/rename/:newCollectionName', attachRollbackRouteHandlerWrapper(renameCollection))
router.post('/:siteName/collections/:collectionPath/move/:targetPath', attachRollbackRouteHandlerWrapper(moveFiles))

module.exports = router;