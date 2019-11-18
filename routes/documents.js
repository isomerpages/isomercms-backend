const express = require('express')
const router = express.Router()
const jwtUtils = require('../utils/jwt-utils')

// Import classes
const { File, DocumentType } = require('../classes/File.js')

// List documents
router.get('/:siteName/documents', async function (req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const IsomerFile = new File(access_token, siteName)
    const documentType = new DocumentType()
    IsomerFile.setFileType(documentType)
    const documents = await IsomerFile.list()

    res.status(200).json({ documents })
  } catch (err) {
    console.log(err)
  }
})

// Create new document
router.post('/:siteName/documents', async function (req, res, next) {
  try {
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
  } catch (err) {
    console.log(err)
  }
})

// Read document
router.get('/:siteName/documents/:documentName', async function (req, res, next) {
  try {
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
  } catch (err) {
    console.log(err)
  }
})

// Update document
router.post('/:siteName/documents/:documentName', async function (req, res, next) {
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
})

// Delete document
router.delete('/:siteName/documents/:documentName', async function (req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, documentName } = req.params
    const { sha } = req.body

    const IsomerFile = new File(access_token, siteName)
    const documentType = new DocumentType()
    IsomerFile.setFileType(documentType)
    await IsomerFile.delete(documentName, sha)

    res.status(200).send('OK')
  } catch (err) {
    console.log(err)
  }
})

// Rename document
router.post('/:siteName/documents/:documentName/rename/:newDocumentName', async function (req, res, next) {
  try {
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
  } catch (err) {
    console.log(err)
  }
})

module.exports = router
