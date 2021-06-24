const express = require("express")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const CollectionDirectoryService = require("@services/directoryServices/CollectionDirectoryService")
const MoverService = require("@services/MoverService")

const router = express.Router()

async function listCollections(req, res) {
  const { accessToken } = req
  const { siteName } = req.params

  const collections = await CollectionDirectoryService.ListAllCollections({
    siteName,
    accessToken,
  })

  return res.status(200).json({ collections })
}

async function createNewCollection(req, res) {
  const { accessToken } = req
  const { siteName } = req.params
  const { collectionName } = req.body

  await CollectionDirectoryService.Create(
    { siteName, accessToken },
    { directoryName: collectionName }
  )

  return res.status(200).json({ collectionName })
}

async function deleteCollection(req, res) {
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, collectionName } = req.params

  await CollectionDirectoryService.Delete(
    { siteName, accessToken, treeSha, currentCommitSha },
    { directoryName: collectionName }
  )

  return res.status(200).json({ collectionName })
}

// Rename collection
async function renameCollection(req, res) {
  // TO-DO: Verify that collection exists

  // Remove collection from config file
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, collectionName, newCollectionName } = req.params

  await CollectionDirectoryService.Rename(
    { siteName, accessToken, treeSha, currentCommitSha },
    { oldDirectoryName: collectionName, newDirectoryName: newCollectionName }
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

  /* eslint-disable no-await-in-loop, no-restricted-syntax */
  for (const fileName of files) {
    await MoverService.MovePage(
      { accessToken, siteName },
      {
        fileName,
        oldFileDirectory: collectionName,
        oldFileThirdNav: collectionSubfolderName,
        newFileDirectory: targetCollectionName,
        newFileThirdNav: targetSubfolderName,
      }
    )
  }

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
