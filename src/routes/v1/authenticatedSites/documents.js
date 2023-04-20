import { Versions } from "@constants"

import { statsMiddleware } from "@root/middleware/stats"

const express = require("express")

const router = express.Router({ mergeParams: true })

// Import classes
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const { File, DocumentType } = require("@classes/File")
const { MediaFile } = require("@classes/MediaFile")

const extractDirectoryAndFileName = (documentName) => {
  let documentDirectory
  let documentFileName

  // documentName contains the file path excluding the media folder, e.g. subfolder1/subfolder2/file.pdf
  const pathArr = documentName.split("/")
  if (pathArr.length === 1) {
    // documentName only contains the file name
    documentDirectory = "files"
    documentFileName = documentName
  } else if (pathArr.length > 1) {
    // We discard the name of the file for the directory
    documentDirectory = `files/${pathArr.slice(0, -1).join("/")}`
    documentFileName = pathArr[pathArr.length - 1]
  }
  return {
    documentDirectory,
    documentFileName,
  }
}

// List documents
async function listDocuments(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName } = req.params
  const { accessToken } = userWithSiteSessionData

  const IsomerFile = new File(accessToken, siteName)
  const documentType = new DocumentType()
  IsomerFile.setFileType(documentType)
  const documents = await IsomerFile.list()

  return res.status(200).json({ documents })
}

// Create new document
async function createNewDocument(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName } = req.params
  const { documentName, documentDirectory, content } = req.body

  // TO-DO:
  // Validate fileName and content

  const IsomerDocumentFile = new MediaFile(accessToken, siteName)
  IsomerDocumentFile.setFileTypeToDocument(documentDirectory)
  const { sha } = await IsomerDocumentFile.create(documentName, content)

  return res.status(200).json({ documentName, content, sha })
}

// Read document
async function readDocument(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName, documentName } = req.params
  const { accessToken } = userWithSiteSessionData

  // get document directory
  const { documentDirectory, documentFileName } = extractDirectoryAndFileName(
    documentName
  )

  const IsomerDocumentFile = new MediaFile(accessToken, siteName)
  IsomerDocumentFile.setFileTypeToDocument(documentDirectory)
  const { sha, content } = await IsomerDocumentFile.read(documentFileName)

  // TO-DO:
  // Validate content

  return res.status(200).json({ documentName, sha, content })
}

// Update document
async function updateDocument(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, documentName } = req.params
  const { content, sha } = req.body

  // TO-DO:
  // Validate pageName and content

  const IsomerFile = new File(accessToken, siteName)
  const documentType = new DocumentType()
  IsomerFile.setFileType(documentType)
  const { newSha } = await IsomerFile.update(documentName, content, sha)

  return res.status(200).json({ documentName, content, sha: newSha })
}

// Delete document
async function deleteDocument(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, documentName } = req.params
  const { sha } = req.body

  const IsomerFile = new File(accessToken, siteName)
  const documentType = new DocumentType()
  IsomerFile.setFileType(documentType)
  await IsomerFile.delete(documentName, sha)

  return res.status(200).send("OK")
}

// Rename document
async function renameDocument(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, documentName, newDocumentName } = req.params

  // TO-DO:
  // Validate documentName and content

  const {
    documentDirectory: oldDocumentDirectory,
    documentFileName: oldDocumentFileName,
  } = extractDirectoryAndFileName(documentName)
  const {
    documentDirectory: newDocumentDirectory,
    documentFileName: newDocumentFileName,
  } = extractDirectoryAndFileName(newDocumentName)

  const oldIsomerDocumentFile = new MediaFile(accessToken, siteName)
  oldIsomerDocumentFile.setFileTypeToDocument(oldDocumentDirectory)
  const { sha, content } = await oldIsomerDocumentFile.read(oldDocumentFileName)
  await oldIsomerDocumentFile.delete(oldDocumentFileName, sha)

  const newIsomerDocumentFile = new MediaFile(accessToken, siteName)
  newIsomerDocumentFile.setFileTypeToDocument(newDocumentDirectory)
  await newIsomerDocumentFile.create(newDocumentFileName, content)

  return res.status(200).send("OK")
}

// Move document
async function moveDocument(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, documentName, newDocumentName } = req.params

  const {
    documentDirectory: oldDocumentDirectory,
    documentFileName: oldDocumentFileName,
  } = extractDirectoryAndFileName(documentName)
  const {
    documentDirectory: newDocumentDirectory,
    documentFileName: newDocumentFileName,
  } = extractDirectoryAndFileName(newDocumentName)

  const oldIsomerDocumentFile = new MediaFile(accessToken, siteName)
  oldIsomerDocumentFile.setFileTypeToDocument(oldDocumentDirectory)
  const { sha, content } = await oldIsomerDocumentFile.read(oldDocumentFileName)
  await oldIsomerDocumentFile.delete(oldDocumentFileName, sha)

  const newIsomerDocumentFile = new MediaFile(accessToken, siteName)
  newIsomerDocumentFile.setFileTypeToDocument(newDocumentDirectory)
  await newIsomerDocumentFile.create(newDocumentFileName, content)

  return res.status(200).send("OK")
}

router.get(
  "/",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "listDocuments"),
  attachReadRouteHandlerWrapper(listDocuments)
)
router.post(
  "/",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "createNewDocument"),
  attachWriteRouteHandlerWrapper(createNewDocument)
)
router.get(
  "/:documentName",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "readDocument"),
  attachReadRouteHandlerWrapper(readDocument)
)
router.post(
  "/:documentName",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "updateDocument"),
  attachWriteRouteHandlerWrapper(updateDocument)
)
router.delete(
  "/:documentName",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "deleteDocument"),
  attachWriteRouteHandlerWrapper(deleteDocument)
)
router.post(
  "/:documentName/rename/:newDocumentName",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "renameDocument"),
  attachRollbackRouteHandlerWrapper(renameDocument)
)
router.post(
  "/:documentName/move/:newDocumentName",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "moveDocument"),
  attachRollbackRouteHandlerWrapper(moveDocument)
)

module.exports = router
