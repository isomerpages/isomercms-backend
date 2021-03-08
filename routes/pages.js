const express = require('express');
const router = express.Router();
const Bluebird = require('bluebird')
const _ = require('lodash')

// Import middleware
const {   
  attachReadRouteHandlerWrapper, 
  attachWriteRouteHandlerWrapper, 
  attachRollbackRouteHandlerWrapper 
} = require('../middleware/routeHandler')

// Import classes
const { File, PageType, CollectionPageType } = require('../classes/File.js')
const { Collection } = require('../classes/Collection.js');
const { create } = require('lodash');
const { CollectionConfig } = require('../classes/Config');

const getUnlinkedPages = async (accessToken, siteName) => {
  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  const simplePages = await IsomerFile.list()
  return simplePages
}

async function listUnlinkedPages (req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params

  const unlinkedPages = await getUnlinkedPages(accessToken, siteName)
  res.status(200).json({ pages: unlinkedPages })
}

// List both simple pages and collection pages
async function listPages (req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params

  const simplePages = await getUnlinkedPages(accessToken, siteName)
  // After listing all simple pages, they're tagged for the frontend
  const taggedSimplePages = simplePages.map(simplePage => {
    return {
      ...simplePage,
      type: 'simple-page'
    }
  })

  const IsomerCollection = new Collection(accessToken, siteName)
  const collections = await IsomerCollection.list() //lists out all collections

  /**
   * This `reduce` function will:
   * 1) Iterate through the collections
   *  a) Lists all the collection pages with `CollectionPage.list()`
   *  b) Map it to tag it with type `collection` [for frontend to know]
   * 2) Concatenate it into the `accumulator`
   * This then returns a flattened array of all collections pages from all collections (`allCollectionPages`)
   */
  const allCollectionPages = await Bluebird.reduce(collections, async (accumulator, collectionName) => {
    const CollectionPage = new File(accessToken, siteName)
    const collectionPageType = new CollectionPageType(collectionName)
    CollectionPage.setFileType(collectionPageType)
    const collectionPages = await CollectionPage.list()
    if (_.isEmpty(collectionPages)) {
      return accumulator
    }
    const collectionPagesWithType = collectionPages.map((item) => ({ ...item, type: 'collection', collectionName })) // tagged with type for frontend

    return accumulator.concat(collectionPagesWithType)
  }, [])

  const pages = taggedSimplePages.concat(allCollectionPages); // collection pages are then concatenated with simple pages
  res.status(200).json({ pages })
}

// Create new page
async function createNewPage (req, res, next) {
  const { accessToken } = req

  const { siteName } = req.params
  const { pageName, content } = req.body

  // TO-DO:
  // Validate pageName and content

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  const { sha } = await IsomerFile.create(pageName, content)

  res.status(200).json({ pageName, content, sha })
}

// Read page
async function readPage(req, res, next) {
  const { accessToken } = req

  const { siteName, pageName } = req.params

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  const { sha, content } = await IsomerFile.read(pageName)

  // TO-DO:
  // Validate content

  res.status(200).json({ pageName, sha, content })
}

// Update page
async function updatePage(req, res, next) {
  const { accessToken } = req

  const { siteName, pageName } = req.params
  const { content, sha } = req.body

  // TO-DO:
  // Validate pageName and content

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  const { newSha } = await IsomerFile.update(pageName, content, sha)

  res.status(200).json({ pageName, content, sha: newSha })
}

// Delete page
async function deletePage (req, res, next) {
  const { accessToken } = req

  const { siteName, pageName } = req.params
  const { sha } = req.body

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  await IsomerFile.delete(pageName, sha)

  res.status(200).send('OK')
}

// Rename page
async function renamePage(req, res, next) {
  const { accessToken } = req

  const { siteName, pageName, newPageName } = req.params
  const { sha, content } = req.body

  // TO-DO:
  // Validate pageName and content

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  const { sha: newSha } = await IsomerFile.create(newPageName, content)
  await IsomerFile.delete(pageName, sha)

  res.status(200).json({ pageName: newPageName, content, sha: newSha })
}

// Move unlinked pages
async function moveUnlinkedPages (req, res, next) {
  const { accessToken } = req
  const { siteName, newPagePath } = req.params
  const { files } = req.body
  const processedTargetPathTokens = decodeURIComponent(newPagePath).split('/')
  const targetCollectionName = processedTargetPathTokens[0]
  const targetSubfolderName = processedTargetPathTokens[1]

  const IsomerCollection = new Collection(accessToken, siteName)
  const collections = await IsomerCollection.list()

  // Check if collection already exists
  if (!collections.includes(targetCollectionName)) {
    await IsomerCollection.create(targetCollectionName)
  }

  const oldIsomerFile = new File(accessToken, siteName)
  const newIsomerFile = new File(accessToken, siteName)
  const oldPageType = new PageType()
  const newCollectionPageType = new CollectionPageType(decodeURIComponent(newPagePath))
  oldIsomerFile.setFileType(oldPageType)
  newIsomerFile.setFileType(newCollectionPageType)
  const newConfig = new CollectionConfig(accessToken, siteName, targetCollectionName)

  // We can't perform these operations concurrently because of conflict issues
  for (const fileName of files) {
    const { content, sha } = await oldIsomerFile.read(fileName)
    await oldIsomerFile.delete(fileName, sha)
    await newIsomerFile.create(fileName, content)

    // Update collection.yml files
    await newConfig.addItemToOrder(`${targetSubfolderName ? `${targetSubfolderName}/` : ''}${fileName}`)
  }

  res.status(200).send('OK')
}


router.get('/:siteName/pages', attachReadRouteHandlerWrapper(listPages))
router.get('/:siteName/unlinkedPages', attachReadRouteHandlerWrapper(listUnlinkedPages))
router.post('/:siteName/pages', attachWriteRouteHandlerWrapper(createNewPage))
router.get('/:siteName/pages/:pageName', attachReadRouteHandlerWrapper(readPage))
router.post('/:siteName/pages/:pageName', attachWriteRouteHandlerWrapper(updatePage))
router.delete('/:siteName/pages/:pageName', attachWriteRouteHandlerWrapper(deletePage))
router.post('/:siteName/pages/:pageName/rename/:newPageName', attachRollbackRouteHandlerWrapper(renamePage))
router.post('/:siteName/pages/move/:newPagePath', attachRollbackRouteHandlerWrapper(moveUnlinkedPages))

module.exports = router;