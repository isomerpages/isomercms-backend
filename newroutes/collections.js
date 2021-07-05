const express = require("express")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const CollectionController = require("@root/controllers/CollectionController")

const router = express.Router()

async function listCollections(req, res) {
  const { accessToken } = req
  const { siteName } = req.params

  const collections = await CollectionController.ListAllCollections({
    siteName,
    accessToken,
  })

  return res.status(200).json({ collections })
}

async function createNewCollection(req, res) {
  const { accessToken } = req
  const { siteName } = req.params
  const { collectionName, files } = req.body

  await CollectionController.CreateCollection(
    { siteName, accessToken },
    { collectionName, orderArray: files }
  )

  return res.status(200).json({ collectionName })
}

async function deleteCollection(req, res) {
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, collectionName } = req.params

  await CollectionController.DeleteCollection(
    { siteName, accessToken, treeSha, currentCommitSha },
    { collectionName }
  )

  return res.status(200).json({ collectionName })
}

// Rename collection
async function renameCollection(req, res) {
  // TO-DO: Verify that collection exists

  // Remove collection from config file
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, collectionName, newCollectionName } = req.params

  await CollectionController.RenameCollection(
    { siteName, accessToken, treeSha, currentCommitSha },
    { oldCollectionName: collectionName, newCollectionName }
  )

  return res.status(200).json({ collectionName, newCollectionName })
}

// Move files in collection
async function moveFiles(req, res) {
  const { accessToken } = req
  const { siteName, collectionPath, targetPath } = req.params
  const { files } = req.body
  const processedCollectionPathTokens = decodeURIComponent(
    collectionPath
  ).split("/")
  const collectionName = processedCollectionPathTokens[0]
  const collectionSubfolderName = processedCollectionPathTokens[1]
  const processedTargetPathTokens = decodeURIComponent(targetPath).split("/")
  const targetCollectionName = processedTargetPathTokens[0]
  const targetSubfolderName = processedTargetPathTokens[1]

  await CollectionController.moveFiles(
    { accessToken, siteName },
    {
      files,
      oldFileCollection: collectionName,
      oldFileThirdNav: collectionSubfolderName,
      newFileCollection: targetCollectionName,
      newFileThirdNav: targetSubfolderName,
    }
  )

  return res.status(200).send("OK")
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
