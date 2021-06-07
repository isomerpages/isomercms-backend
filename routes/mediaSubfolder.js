const express = require("express")

const router = express.Router()

// Import middleware
const {
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("../middleware/routeHandler")

// Import classes
const { MediaSubfolder } = require("../classes/MediaSubfolder.js")

// Create new collection
async function createSubfolder(req, res, next) {
  const { accessToken } = req
  const { siteName, mediaType, folderPath } = req.params

  const processedFolderPath = decodeURIComponent(folderPath)

  const IsomerMediaSubfolder = new MediaSubfolder(
    accessToken,
    siteName,
    mediaType
  )
  await IsomerMediaSubfolder.create(processedFolderPath)

  res.status(200).send("OK")
}

// Delete collection
async function deleteSubfolder(req, res, next) {
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, mediaType, folderPath } = req.params

  const processedFolderPath = decodeURIComponent(folderPath)

  const IsomerMediaSubfolder = new MediaSubfolder(
    accessToken,
    siteName,
    mediaType
  )
  await IsomerMediaSubfolder.delete(
    processedFolderPath,
    currentCommitSha,
    treeSha
  )

  res.status(200).send("OK")
}

// Rename collection
async function renameSubfolder(req, res, next) {
  const { accessToken, currentCommitSha, treeSha } = req
  const { siteName, mediaType, oldFolderPath, newFolderPath } = req.params

  const processedOldFolderPath = decodeURIComponent(oldFolderPath)
  const processedNewFolderPath = decodeURIComponent(newFolderPath)

  const IsomerMediaSubfolder = new MediaSubfolder(
    accessToken,
    siteName,
    mediaType
  )
  await IsomerMediaSubfolder.rename(
    processedOldFolderPath,
    processedNewFolderPath,
    currentCommitSha,
    treeSha
  )

  res.status(200).send("OK")
}

router.post(
  "/:siteName/media/:mediaType/:folderPath",
  attachWriteRouteHandlerWrapper(createSubfolder)
)
router.delete(
  "/:siteName/media/:mediaType/:folderPath",
  attachRollbackRouteHandlerWrapper(deleteSubfolder)
)
router.post(
  "/:siteName/media/:mediaType/:oldFolderPath/rename/:newFolderPath",
  attachRollbackRouteHandlerWrapper(renameSubfolder)
)

module.exports = router
