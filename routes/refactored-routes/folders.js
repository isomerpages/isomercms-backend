import SubfolderHandler from "../../classes/route-handlers/SubfolderHandler"

const express = require("express")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const router = express.Router()

// List pages and directories from all folders
async function listAllFolderContent(req, res) {
  const { accessToken } = req
  const { siteName } = req.params

  const foldersHandler = new SubfolderHandler(accessToken, siteName)
  const allFolderContent = await foldersHandler.listAll()

  return res.status(200).json({ allFolderContent })
}

// Delete subfolder
async function deleteSubfolder(req, res) {
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, folderName, subfolderName } = req.params

  const foldersHandler = new SubfolderHandler(accessToken, siteName)
  await foldersHandler.delete(folderName, subfolderName, currentCommitSha, treeSha)

  return res.status(200).send("OK")
}

// Rename subfolder
async function renameSubfolder(req, res) {
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, folderName, subfolderName, newSubfolderName } = req.params

  const foldersHandler = new SubfolderHandler(accessToken, siteName)
  await foldersHandler.rename(folderName, subfolderName, newSubfolderName, currentCommitSha, treeSha)

  return res.status(200).send("OK")
}

router.get(
  "/:siteName/folders/all",
  attachReadRouteHandlerWrapper(listAllFolderContent)
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