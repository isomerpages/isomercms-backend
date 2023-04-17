import { VERSIONS } from "@constants"

import { statsMiddleware } from "@root/middleware/stats"

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
  const { userWithSiteSessionData } = res.locals
  const { siteName, mediaType, folderPath } = req.params
  const { accessToken } = userWithSiteSessionData

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
  const { userWithSiteSessionData } = res.locals
  const { siteName, mediaType, folderPath } = req.params
  const { accessToken } = userWithSiteSessionData
  const { currentCommitSha, treeSha } = userWithSiteSessionData.getGithubState()

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
  const { userWithSiteSessionData } = res.locals
  const { siteName, mediaType, oldFolderPath, newFolderPath } = req.params
  const { accessToken } = userWithSiteSessionData
  const { currentCommitSha, treeSha } = userWithSiteSessionData.getGithubState()

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

router.post(
  "/:folderPath",
  statsMiddleware.logVersionNumberCallFor(VERSIONS.v1, "createSubfolder"),
  attachWriteRouteHandlerWrapper(createSubfolder)
)
router.delete(
  "/:folderPath",
  statsMiddleware.logVersionNumberCallFor(VERSIONS.v1, "deleteSubfolder"),
  attachRollbackRouteHandlerWrapper(deleteSubfolder)
)
router.post(
  "/:oldFolderPath/rename/:newFolderPath",
  statsMiddleware.logVersionNumberCallFor(VERSIONS.v1, "renameSubfolder"),
  attachRollbackRouteHandlerWrapper(renameSubfolder)
)

module.exports = router
