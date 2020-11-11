const express = require('express')
const router = express.Router()
const Bluebird = require('bluebird')
const base64 = require('base-64')
const yaml = require('js-yaml')
const _ = require('lodash')

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import error
const { NotFoundError  } = require('../errors/NotFoundError')

// Import classes 
const { Collection } = require('../classes/Collection.js')
const { File, CollectionPageType, DataType } = require('../classes/File.js')

// Import util functions
const { readCollectionPageUtilFunc, createDataFileUtilFunc } = require('../utils/route-utils')

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
  const { accessToken } = req
  const { siteName, collectionName } = req.params

  const IsomerCollection = new Collection(accessToken, siteName)
  await IsomerCollection.delete(collectionName)

  res.status(200).json({ collectionName })
}

// Rename collection
async function renameCollection (req, res, next) {
  // TO-DO: Verify that collection exists

  // Remove collection from config file
  const { accessToken } = req
  const { siteName, collectionName, newCollectionName } = req.params

  const IsomerCollection = new Collection(accessToken, siteName)
  await IsomerCollection.rename(collectionName, newCollectionName)

  res.status(200).json({ collectionName, newCollectionName })
}

// Retrieve navigation file for collection
async function retrieveCollectionNav (req, res, next) {

}

// Create navigation file for collection
async function createCollectionNav (req, res, next) {
  // Remove collection from config file
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

  // Create a _data file
  const encodedCollectionHierarchy = base64.encode(yaml.safeDump({
    pages: collectionHierarchy
  }))
  const collectionHierarchyFilePath = `collections/${collectionName}.yml`
  await createDataFileUtilFunc(accessToken, siteName, collectionHierarchyFilePath, encodedCollectionHierarchy)

  res.status(200).json('Ok')
}

router.get('/:siteName/collections', attachRouteHandlerWrapper(listCollections))
router.post('/:siteName/collections', attachRouteHandlerWrapper(createNewCollection))
router.delete('/:siteName/collections/:collectionName', attachRouteHandlerWrapper(deleteCollection))
router.post('/:siteName/collections/:collectionName/rename/:newCollectionName', attachRouteHandlerWrapper(renameCollection))
router.get('/:siteName/collections/:collectionName/nav', attachRouteHandlerWrapper(retrieveCollectionNav))
router.post('/:siteName/collections/:collectionName/nav', attachRouteHandlerWrapper(createCollectionNav))

module.exports = router;