const express = require('express');
const router = express.Router();
const Bluebird = require('bluebird');
const yaml = require('js-yaml');
const base64 = require('base-64');
const _ = require('lodash');

// Import middleware
const { 
  attachReadRouteHandlerWrapper, 
  attachWriteRouteHandlerWrapper, 
  attachRollbackRouteHandlerWrapper 
} = require('../middleware/routeHandler')

// Import classes 
const { Collection } = require('../classes/Collection')
const { CollectionConfig } = require('../classes/Config');
const { File, CollectionPageType } = require('../classes/File');
const { update } = require('lodash');

// Import utils
const { readCollectionPageUtilFunc } = require('../utils/route-utils')

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

// Get details on all pages in a collection
async function listCollectionPagesDetails(req, res, next) {
  const { accessToken } = req
  const { siteName, collectionName } = req.params

  // Verify that collection exists
  const IsomerCollection = new Collection(accessToken, siteName)
  const collections = await IsomerCollection.list()
  if (!(collections.includes(collectionName))) throw new NotFoundError('Collection provided was not a valid collection')

  // Retrieve metadata of files in collection
  const CollectionPage = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  CollectionPage.setFileType(collectionPageType)
  const collectionPages = await CollectionPage.list()
  const collectionPagesMetadata = await Bluebird.map(collectionPages, async (page) => {
    const { content } = await readCollectionPageUtilFunc(accessToken, siteName, collectionName, page.fileName)
    const frontMatter = yaml.safeLoad(base64.decode(content).split('---')[1])
    return {
      fileName: page.fileName,
      title: frontMatter.title,
      thirdNavTitle: frontMatter.third_nav_title
    }
  })

  const collectionHierarchy = collectionPagesMetadata.reduce((acc, file) => {
    if (file.thirdNavTitle) {
      // Check whether third nav section already exists
      const thirdNavIteratee = { type: 'third-nav', 'title': file.thirdNavTitle }
      if (_.some(acc, thirdNavIteratee)) {
        const thirdNavIdx = _.findIndex(acc, thirdNavIteratee)
        acc[thirdNavIdx].contents.push({
          type: 'third-nav-page',
          title: file.title,
          fileName: file.fileName,
        })
        return acc
      }

      // Create new third nav section
      acc.push({
        type: 'third-nav',
        title: file.thirdNavTitle,
        contents: [{
          type: 'third-nav-page',
          title: file.title,
          fileName: file.fileName,
        }]
      })
      return acc
    }

    // If no third nav title, just push into array
    acc.push({
      type: 'page',
      title: file.title,
      fileName: file.fileName,
    })
    return acc
  }, [])

  res.status(200).json({ collectionPages: collectionHierarchy })
}

// Create new page in collection
async function createNewcollectionPage (req, res, next) {
  const { accessToken } = req

  const { siteName, collectionName } = req.params
  const { pageName, content } = req.body

  // Check if collection exists and create if it does not
  const IsomerCollection = new Collection(accessToken, siteName)
  const collections = await IsomerCollection.list()
  if (!collections.includes(collectionName)) {
    await IsomerCollection.create(collectionName)
  }
  // TO-DO:
  // Validate pageName and content

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  const { sha } = await IsomerFile.create(pageName, content)

  res.status(200).json({ collectionName, pageName, content, sha })
}

// // Create new page in collection
async function createCollectionPage (req, res, next) {
  const { accessToken } = req

  const { siteName, collectionName, pageName: encodedPageName } = req.params
  const { content: pageContent } = req.body
  const pageName = decodeURIComponent(encodedPageName)
  
  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  await IsomerFile.create(pageName, Base64.encode(pageContent))

  const config = new CollectionConfig(accessToken, siteName, collectionName)
  await config.addItemToOrder(pageName)

  res.status(200).json({collectionName, pageName, pageContent })
}

// Read page in collection
async function readCollectionPage(req, res, next) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const pageName = decodeURIComponent(encodedPageName)

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

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const { content: unencodedContent, sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)
  
  const content = base64.encode(unencodedContent)

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
  const { accessToken, currentCommitSha, treeSha } = req

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const { sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)
  // TO-DO:
  // Validate that collection exists

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  await IsomerFile.delete(pageName, sha)

  // Check if collection has any pages left, and delete if none left
  const collectionPages = await IsomerFile.list()
  if (collectionPages.length === 1 && collectionPages[0].fileName === 'collection.yml') {
    const IsomerCollection = new Collection(accessToken, siteName)
    await IsomerCollection.delete(collectionName, currentCommitSha, treeSha)
  }

  res.status(200).send('OK')
}

// Rename page in collection
async function renameCollectionPage (req, res, next) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName, collectionName, newPageName } = req.params
  const { sha, content } = req.body
  const pageName = decodeURIComponent(encodedPageName)

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

router.get('/:siteName/collections/:collectionName', attachReadRouteHandlerWrapper(listCollectionPages))
router.get('/:siteName/collections/:collectionName/pages', attachReadRouteHandlerWrapper(listCollectionPagesDetails))
router.post('/:siteName/collections/:collectionName/pages', attachRollbackRouteHandlerWrapper(createNewcollectionPage)) // to remove
router.post('/:siteName/collections/:collectionName/pages/new/:pageName', attachRollbackRouteHandlerWrapper(createCollectionPage))
router.get('/:siteName/collections/:collectionName/pages/:pageName', attachReadRouteHandlerWrapper(readCollectionPage))
router.post('/:siteName/collections/:collectionName/pages/:pageName', attachWriteRouteHandlerWrapper(updateCollectionPage))
router.delete('/:siteName/collections/:collectionName/pages/:pageName', attachRollbackRouteHandlerWrapper(deleteCollectionPage))
router.post('/:siteName/collections/:collectionName/pages/:pageName/rename/:newPageName', attachRollbackRouteHandlerWrapper(renameCollectionPage))

module.exports = router;