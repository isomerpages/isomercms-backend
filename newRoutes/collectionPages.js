const Bluebird = require("bluebird")
const express = require("express")
const _ = require("lodash")
const yaml = require("yaml")

// Import errors
const { NotFoundError } = require("@errors/NotFoundError")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const { Collection } = require("@classes/Collection")
const { CollectionConfig } = require("@classes/Config")
const { File, CollectionPageType } = require("@classes/File")

// Import utils
const { readCollectionPageUtilFunc } = require("@utils/route-utils")

const FolderPageService = require('../fileServices/MdPageServices/FolderPageService')
const FolderYmlService = require('../fileServices/YmlFileServices/FolderYmlService')
const FolderDirectoryService = require('../directoryServices/FolderService')


const router = express.Router()

// // Create new page in collection
async function createCollectionPage(req, res) {
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

  return res.status(200).json({ collectionName, pageName, pageContent })
}

// assumes that our files are either md or yml
const isMdFile = (pageName) => pageName.split('.')[1] === 'md'

// Read page in collection
async function readCollectionPage(req, res) {
  const { accessToken } = req
  const { siteName, pageName, collectionName } = req.params // no need for decoding - express does it automatically

  const reqDetails = { accessToken, siteName }
  const opts = { pageName, collectionName }
  
  const isMd = isMdFile(pageName)

  const { sha, content} = isMd ? await FolderPageService.Read(opts, reqDetails) : await FolderYmlService.Read(opts, reqDetails)

  // TO-DO:
  // Validate content

  return res.status(200).json({ collectionName, pageName, sha, content })
}

// Update page in collection
async function updateCollectionPage(req, res) {
  const { accessToken } = req
  const { siteName, pageName, collectionName } = req.params // no need for decoding - express does it automatically
    
  const { content: pageContent, sha } = req.body

  // TO-DO:
  // Validate pageName and content

  const reqDetails = { accessToken, siteName }
  const opts = { pageName, collectionName, fileContent: pageContent, sha }

  const { newSha } = await FolderPageService.Update(opts, reqDetails)

  return res
    .status(200)
    .json({ collectionName, pageName, pageContent, sha: newSha })
}

// Delete page in collection
async function deleteCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const { sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)
  // TO-DO:
  // Validate that collection exists

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  await IsomerFile.delete(pageName, sha)

  const collectionConfig = new CollectionConfig(
    accessToken,
    siteName,
    collectionName
  )
  await collectionConfig.deleteItemFromOrder(pageName)

  return res.status(200).send("OK")
}

// Rename page in collection
async function renameCollectionPage(req, res) {
  const { accessToken } = req

  const {
    siteName,
    pageName: encodedPageName,
    collectionName,
    newPageName: encodedNewPageName,
  } = req.params
  const { sha, content: pageContent } = req.body

  const pageName = decodeURIComponent(encodedPageName)
  const newPageName = decodeURIComponent(encodedNewPageName)

  const collectionConfig = new CollectionConfig(
    accessToken,
    siteName,
    collectionName
  )
  // TO-DO:
  // Validate that collection exists
  // Validate pageName and content

  // Create new collection page with name ${newPageName}

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  const { sha: newSha } = await IsomerFile.create(
    newPageName,
    Base64.encode(pageContent)
  )
  await IsomerFile.delete(pageName, sha)
  await collectionConfig.updateItemInOrder(pageName, newPageName)

  return res
    .status(200)
    .json({ collectionName, pageName: newPageName, pageContent, sha: newSha })
}

router.post(
  "/:siteName/collections/:collectionName/pages/new/:pageName",
  attachRollbackRouteHandlerWrapper(createCollectionPage)
)
router.get(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachReadRouteHandlerWrapper(readCollectionPage)
)
router.post(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachWriteRouteHandlerWrapper(updateCollectionPage)
)
router.delete(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachRollbackRouteHandlerWrapper(deleteCollectionPage)
)
router.post(
  "/:siteName/collections/:collectionName/pages/:pageName/rename/:newPageName",
  attachRollbackRouteHandlerWrapper(renameCollectionPage)
)

module.exports = router
