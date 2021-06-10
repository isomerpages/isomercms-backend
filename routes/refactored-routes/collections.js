import CollectionsHandler from "../../classes/route-handlers/CollectionsHandler"

const express = require("express")
const router = express.Router()

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// List collections
async function listCollections(req, res) {
  const { accessToken } = req
  const { siteName } = req.params

  const collectionsHandler = new CollectionsHandler(accessToken, siteName)
  const collections = await collectionsHandler.list()

  return res.status(200).json({ collections })
}

// Create collection with files
// TODO unused route, collections created in pages.js move instead
async function createNewCollection(req, res) {
  const { accessToken } = req
  const { siteName } = req.params
  const { collectionName } = req.body

  const collectionsHandler = new CollectionsHandler(accessToken, siteName)
  await collectionsHandler.create(collectionName)

  return res.status(200).json({ collectionName })
}

async function deleteCollection(req, res) {
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, collectionName } = req.params

  const collectionsHandler = new CollectionsHandler(accessToken, siteName)
  await collectionsHandler.delete(collectionName, currentCommitSha, treeSha)

  return res.status(200).json({ collectionName })
}

async function renameCollection(req, res) {
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, collectionName, newCollectionName } = req.params

  const collectionsHandler = new CollectionsHandler(accessToken, siteName)
  await collectionsHandler.rename(collectionName, newCollectionName, currentCommitSha, treeSha)

  return res.status(200).json({ collectionName, newCollectionName })
}

router.get(
  "/:siteName/collections",
  attachReadRouteHandlerWrapper(listCollections)
)
router.post(
  "/:siteName/collections",
  attachRollbackRouteHandlerWrapper(createNewCollection)
)
router.delete(
  "/:siteName/collections/:collectionName",
  attachRollbackRouteHandlerWrapper(deleteCollection)
)
router.post(
  "/:siteName/collections/:collectionName/rename/:newCollectionName",
  attachRollbackRouteHandlerWrapper(renameCollection)
)
router.post(
  "/:siteName/collections/:collectionPath/move/:targetPath",
  attachRollbackRouteHandlerWrapper(moveFiles)
)

module.exports = router