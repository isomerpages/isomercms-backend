const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import classes 
const { File, CollectionPageType } = require('../classes/File.js')

// List pages in collection
router.get('/:siteName/collections/:collectionName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName, collectionName } = req.params

    // TO-DO: Verify that collection exists

    const GitHubFile = new File(access_token, siteName)
    const collectionPageType = new CollectionPageType(collectionName)
    GitHubFile.setFileType(collectionPageType)
    const collectionPages = await GitHubFile.list()

    res.status(200).json({ collectionPages })

  } catch (err) {
    console.log(err)
  }
})

// Create new page in collection
router.post('/:siteName/collections/:collectionName/pages', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, collectionName } = req.params
    const { pageName, content } = req.body

    // TO-DO:
    // Validate that collection exists
    // Validate pageName and content

    const GitHubFile = new File(access_token, siteName)
    const collectionPageType = new CollectionPageType(collectionName)
    GitHubFile.setFileType(collectionPageType)
    const { sha } = await GitHubFile.create(pageName, content)

    res.status(200).json({ collectionName, pageName, content, sha })
  } catch (err) {
    console.log(err)
  }
})

// Read page in collection
router.get('/:siteName/collections/:collectionName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, collectionName } = req.params

    const GitHubFile = new File(access_token, siteName)
    const collectionPageType = new CollectionPageType(collectionName)
    GitHubFile.setFileType(collectionPageType)
    const { sha, content } = await GitHubFile.read(pageName)

    // TO-DO:
    // Validate content

    res.status(200).json({ collectionName, pageName, sha, content })
  } catch (err) {
    console.log(err)
  }
})

// Update page in collection
router.post('/:siteName/collections/:collectionName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, collectionName } = req.params
    const { content, sha } = req.body

    // TO-DO:
    // Validate pageName and content

    const GitHubFile = new File(access_token, siteName)
    const collectionPageType = new CollectionPageType(collectionName)
    GitHubFile.setFileType(collectionPageType)
    const { newSha } = await GitHubFile.update(pageName, content, sha)

    res.status(200).json({ collectionName, pageName, content, sha: newSha })
  } catch (err) {
    console.log(err)
  }
})


// Delete page in collection
router.delete('/:siteName/collections/:collectionName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, collectionName } = req.params
    const { sha } = req.body

    // TO-DO:
    // Validate that collection exists

    const GitHubFile = new File(access_token, siteName)
    const collectionPageType = new CollectionPageType(collectionName)
    GitHubFile.setFileType(collectionPageType)
    await GitHubFile.delete(pageName, sha)

    res.status(200).send('OK')
  } catch (err) {
    console.log(err)
  }
})

// Rename page in collection
router.post('/:siteName/collections/:collectionName/pages/:pageName/rename/:newPageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, collectionName, newPageName } = req.params
    const { sha, content } = req.body

    // TO-DO:
    // Validate that collection exists
    // Validate pageName and content

    // Create new collection page with name ${newPageName}

    const GitHubFile = new File(access_token, siteName)
    const collectionPageType = new CollectionPageType(collectionName)
    GitHubFile.setFileType(collectionPageType)
    const { sha: newSha } = await GitHubFile.create(newPageName, content)
    await GitHubFile.delete(pageName, sha)

    res.status(200).json({ collectionName, pageName: newPageName, content, sha: newSha })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;