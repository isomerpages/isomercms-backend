const express = require("express")

const router = express.Router()

// Import classes
const { File, DocumentType } = require("@classes/File.js")
const { MediaFile } = require("@classes/MediaFile.js")
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

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
  const { accessToken } = req
  const { siteName } = req.params

  const IsomerFile = new File(accessToken, siteName)
  const documentType = new DocumentType()
  IsomerFile.setFileType(documentType)
  const documents = await IsomerFile.list()

  return res.status(200).json({ documents })
}

// Create new document
async function createNewDocument(req, res) {
  const { accessToken } = req

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
  const { accessToken } = req
  const { siteName, documentName } = req.params

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
  const { accessToken } = req

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
  const { accessToken } = req

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
  const { accessToken } = req

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
  const { accessToken } = req

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

router.get("/:siteName/documents", attachReadRouteHandlerWrapper(listDocuments))
router.post(
  "/:siteName/documents",
  attachWriteRouteHandlerWrapper(createNewDocument)
)
router.get(
  "/:siteName/documents/:documentName",
  attachReadRouteHandlerWrapper(readDocument)
)
router.post(
  "/:siteName/documents/:documentName",
  attachWriteRouteHandlerWrapper(updateDocument)
)
router.delete(
  "/:siteName/documents/:documentName",
  attachWriteRouteHandlerWrapper(deleteDocument)
)
router.post(
  "/:siteName/documents/:documentName/rename/:newDocumentName",
  attachRollbackRouteHandlerWrapper(renameDocument)
)
router.post(
  "/:siteName/documents/:documentName/move/:newDocumentName",
  attachRollbackRouteHandlerWrapper(moveDocument)
)

module.exports = router
