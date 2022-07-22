const express = require("express")

const router = express.Router({ mergeParams: true })

// Import middleware
const {
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const { MediaSubfolder } = require("@classes/MediaSubfolder")

// Create new collection
async function createSubfolder(req, res) {
  const { sessionData } = res.locals
  const { siteName, mediaType, folderPath } = req.params
  const accessToken = sessionData.getAccessToken()

  const processedFolderPath = decodeURIComponent(folderPath)

  const IsomerMediaSubfolder = new MediaSubfolder(
    accessToken,
    siteName,
    mediaType
  )
  await IsomerMediaSubfolder.create(processedFolderPath)

  return res.status(200).send("OK")
}

// Delete collection
async function deleteSubfolder(req, res) {
  const { sessionData } = res.locals
  const { siteName, mediaType, folderPath } = req.params
  const accessToken = sessionData.getAccessToken()
  const { currentCommitSha, treeSha } = sessionData.getGithubState

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

  return res.status(200).send("OK")
}

// Rename collection
async function renameSubfolder(req, res) {
  const { sessionData } = res.locals
  const { siteName, mediaType, oldFolderPath, newFolderPath } = req.params
  const accessToken = sessionData.getAccessToken()
  const { currentCommitSha, treeSha } = sessionData.getGithubState

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

  return res.status(200).send("OK")
}

router.post("/:folderPath", attachWriteRouteHandlerWrapper(createSubfolder))
router.delete(
  "/:folderPath",
  attachRollbackRouteHandlerWrapper(deleteSubfolder)
)
router.post(
  "/:oldFolderPath/rename/:newFolderPath",
  attachRollbackRouteHandlerWrapper(renameSubfolder)
)

module.exports = router
