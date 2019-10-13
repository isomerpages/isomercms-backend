const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import classes 
const { File, DocumentType } = require('../classes/File.js')

// List documents
router.get('/:siteName/documents', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const GitHubFile = new File(access_token, siteName)
    const documentType = new DocumentType()
    GitHubFile.setFileType(documentType)
    const files = await GitHubFile.list()
    
    res.status(200).json({ files })
  } catch (err) {
    console.log(err)
  }
})

// Create new document
router.post('/:siteName/documents', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName } = req.params
    const { documentName, content } = req.body

    // TO-DO:
    // Validate fileName and content

    const GitHubFile = new File(access_token, siteName)
    const documentType = new DocumentType()
    GitHubFile.setFileType(documentType)
    await GitHubFile.create(documentName, content)

    res.status(200).json({ documentName, content })
  } catch (err) {
    console.log(err)
  }
})

// Read document
router.get('/:siteName/documents/:documentName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, documentName } = req.params

    const GitHubFile = new File(access_token, siteName)
    const documentType = new DocumentType()
    GitHubFile.setFileType(documentType)
    const { sha, content } = await GitHubFile.read(documentName)

    // TO-DO:
    // Validate content

    res.status(200).json({ fileName, sha, content })
  } catch (err) {
    console.log(err)
  }
})

// Update document
router.post('/:siteName/documents/:documentName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, documentName } = req.params
    const { content, sha } = req.body

    // TO-DO:
    // Validate pageName and content

    const GitHubFile = new File(access_token, siteName)
    const documentType = new DocumentType()
    GitHubFile.setFileType(documentType)
    await GitHubFile.update(documentName, content, sha)
    
    res.status(200).json({ documentName, content })
  } catch (err) {
    console.log(err)
  }
})

// Delete document
router.delete('/:siteName/documents/:documentName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, documentName } = req.params
    const { sha } = req.body

    const GitHubFile = new File(access_token, siteName)
    const documentType = new DocumentType()
    GitHubFile.setFileType(documentType)
    await GitHubFile.delete(documentName, sha)

    res.status(200).json({ documentName, content })
  } catch (err) {
    console.log(err)
  }
})

// Rename document
router.post('/:siteName/documents/:documentName/rename/:newDocumentName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, documentName, newDocumentName } = req.params
    const { sha, content } = req.body

    // TO-DO:
    // Validate documentName and content

    const GitHubFile = new File(access_token, siteName)
    const documentType = new DocumentType()
    GitHubFile.setFileType(documentType)
    await GitHubFile.create(newDocumentName, content)
    await GitHubFile.delete(documentName, sha)

    res.status(200).json({ newDocumentName, content })
  } catch (err) {
    console.log(err)
  }
})


module.exports = router;