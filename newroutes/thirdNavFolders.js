const Bluebird = require("bluebird")
const express = require("express")

const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const CollectionController = require("@root/controllers/CollectionController")

const router = express.Router()

// TODO: change frontend endpoint, superceded by collections.listCollections
async function listAllFolderContent(req, res) {
  const { accessToken } = req
  const { siteName } = req.params

  const allFolderContent = await CollectionController.ListAllCollectionContent({
    accessToken,
    siteName,
  })

  return res.status(200).json(allFolderContent)
}

// Create subfolder
async function createSubfolder(req, res) {
  const { accessToken } = req
  const { siteName, folderName: collectionName } = req.params
  const { thirdNavTitle, files } = req.body

  await CollectionController.CreateSubcollection(
    { accessToken, siteName },
    { collectionName, thirdNavTitle, orderArray: files }
  )

  return res.status(200).send("OK")
}

// Delete subfolder
async function deleteSubfolder(req, res) {
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, folderName, subfolderName } = req.params

  await CollectionController.DeleteSubcollection(
    { accessToken, currentCommitSha, treeSha, siteName },
    { collectionName: folderName, thirdNavTitle: subfolderName }
  )

  return res.status(200).send("OK")
}

// Rename subfolder
async function renameSubfolder(req, res) {
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, folderName, subfolderName, newSubfolderName } = req.params

  await CollectionController.RenameSubcollection(
    { accessToken, currentCommitSha, treeSha, siteName },
    {
      collectionName: folderName,
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
