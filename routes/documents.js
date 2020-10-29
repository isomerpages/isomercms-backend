const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import classes 
const { File, DocumentType } = require('../classes/File.js');
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler');

// List documents
async function listDocuments (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)
  const { siteName } = req.params

  const IsomerFile = new File(access_token, siteName)
  const documentType = new DocumentType()
  IsomerFile.setFileType(documentType)
  const documents = await IsomerFile.list()
  
  res.status(200).json({ documents })
}

// Create new document
async function createNewDocument (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)

  const { siteName } = req.params
  const { documentName, content } = req.body

  // TO-DO:
  // Validate fileName and content

  const IsomerFile = new File(access_token, siteName)
  const documentType = new DocumentType()
  IsomerFile.setFileType(documentType)
  const { sha } = await IsomerFile.create(documentName, content)

  res.status(200).json({ documentName, content, sha })
}

// Read document
async function readDocument (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)

  const { siteName, documentName } = req.params

  const IsomerFile = new File(access_token, siteName)
  const documentType = new DocumentType()
  IsomerFile.setFileType(documentType)
  const { sha, content } = await IsomerFile.read(documentName)

  // TO-DO:
  // Validate content

  res.status(200).json({ documentName, sha, content })
}

// Update document
async function updateDocument (req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, documentName } = req.params
    const { content, sha } = req.body

    // TO-DO:
    // Validate pageName and content

    const IsomerFile = new File(access_token, siteName)
    const documentType = new DocumentType()
    IsomerFile.setFileType(documentType)
    const { newSha } = await IsomerFile.update(documentName, content, sha)
    
    res.status(200).json({ documentName, content, sha: newSha })
  } catch (err) {
    console.log(err)
  }
}

// Delete document
async function deleteDocument (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)

  const { siteName, documentName } = req.params
  const { sha } = req.body

  const IsomerFile = new File(access_token, siteName)
  const documentType = new DocumentType()
  IsomerFile.setFileType(documentType)
  await IsomerFile.delete(documentName, sha)

  res.status(200).send('OK')
}

// Rename document
async function renameDocument (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)

  const { siteName, documentName, newDocumentName } = req.params
  const { sha, content } = req.body

  // TO-DO:
  // Validate documentName and content

  const IsomerFile = new File(access_token, siteName)
  const documentType = new DocumentType()
  IsomerFile.setFileType(documentType)
  const { sha: newSha } = await IsomerFile.create(newDocumentName, content)
  await IsomerFile.delete(documentName, sha)

  res.status(200).json({ documentName: newDocumentName, content, sha: newSha })
}

router.get('/:siteName/documents', attachRouteHandlerWrapper(listDocuments))
router.post('/:siteName/documents', attachRouteHandlerWrapper(createNewDocument))
router.get('/:siteName/documents/:documentName', attachRouteHandlerWrapper(readDocument))
router.post('/:siteName/documents/:documentName', attachRouteHandlerWrapper(updateDocument))
router.delete('/:siteName/documents/:documentName', attachRouteHandlerWrapper(deleteDocument))
router.post('/:siteName/documents/:documentName/rename/:newDocumentName', attachRouteHandlerWrapper(renameDocument))

module.exports = router;