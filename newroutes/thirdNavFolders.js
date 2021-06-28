const Bluebird = require("bluebird")
const express = require("express")

const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const { Collection } = require("@classes/Collection")
const { CollectionConfig } = require("@classes/Config")

const ThirdNavDirectoryService = require("@services/directoryServices/ThirdNavDirectoryService")

const router = express.Router()

// TODO: change frontend endpoint, superceded by collections.listCollections
async function listAllFolderContent(req, res) {
  const { accessToken } = req
  const { siteName } = req.params

  const IsomerCollection = new Collection(accessToken, siteName)
  const allFolders = IsomerCollection.list()

  const allFolderContent = []

  await Bluebird.map(allFolders, async (collectionName) => {
    const config = new CollectionConfig(accessToken, siteName, collectionName)
    const { sha, content } = await config.read()
    allFolderContent.push({ name: collectionName, sha, content })
  })

  return res.status(200).json({ allFolderContent })
}

// Create subfolder
async function createSubfolder(req, res) {
  const { accessToken } = req
  const { siteName, folderName: collectionName } = req.params
  const { thirdNavTitle, files } = req.body

  await ThirdNavDirectoryService.Create(
    { accessToken, siteName },
    { directoryName: collectionName, thirdNavTitle, orderArray: files }
  )

  return res.status(200).send("OK")
}

// Delete subfolder
async function deleteSubfolder(req, res) {
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, folderName, subfolderName } = req.params

  await ThirdNavDirectoryService.Delete(
    { accessToken, currentCommitSha, treeSha, siteName },
    { directoryName: folderName, thirdNavTitle: subfolderName }
  )

  return res.status(200).send("OK")
}

// Rename subfolder
async function renameSubfolder(req, res) {
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, folderName, subfolderName, newSubfolderName } = req.params

  await ThirdNavDirectoryService.Rename(
    { accessToken, currentCommitSha, treeSha, siteName },
    {
      directoryName: folderName,
      oldThirdNavTitle: subfolderName,
      newThirdNavTitle: newSubfolderName,
    }
  )

  return res.status(200).send("OK")
}

router.get(
  "/:siteName/folders/all",
  attachReadRouteHandlerWrapper(listAllFolderContent)
)
router.post(
  "/:siteName/folders/:folderName/subfolder",
  attachRollbackRouteHandlerWrapper(createSubfolder)
)
router.delete(
  "/:siteName/folders/:folderName/subfolder/:subfolderName",
  attachRollbackRouteHandlerWrapper(deleteSubfolder)
)
router.post(
  "/:siteName/folders/:folderName/subfolder/:subfolderName/rename/:newSubfolderName",
  attachRollbackRouteHandlerWrapper(renameSubfolder)
)

module.exports = router
