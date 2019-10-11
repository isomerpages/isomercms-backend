const express = require('express');
const router = express.Router();
const axios = require('axios');
const base64 = require('base-64');
const jwtUtils = require('../utils/jwt-utils')
const _ = require('lodash')

// Import classes 
const { File, CollectionPageType } = require('../classes/File.js')

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
    GitHubFile.setFileType(CollectionPageType(collectionName))
    await GitHubFile.create(pageName, content)

    res.status(200).json({ collectionName, pageName, content })
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
    GitHubFile.setFileType(CollectionPageType(collectionName))
    const { sha, content } = await GitHubFile.read(pageName)

    const content = resp.data.content
    const sha = resp.data.sha

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
    GitHubFile.setFileType(CollectionPageType(collectionName))
    await GitHubFile.update(pageName, content, sha)

    res.status(200).json({ pageName, content })
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
    GitHubFile.setFileType(CollectionPageType(collectionName))
    await GitHubFile.delete(pageName, sha)

    res.status(200).json({ collectionName, pageName, content })
  } catch (err) {
    console.log(err)
  }
})

// Rename page in collection
router.post('/:siteName/collections/:collectionName/pages/:pageName/rename', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, collectionName } = req.params
    const { newPageName, sha, content } = req.body

    // TO-DO:
    // Validate that collection exists
    // Validate pageName and content

    // Create new collection page with name ${newPageName}

    const GitHubFile = new File(access_token, siteName)
    GitHubFile.setFileType(CollectionPageType(collectionName))
    await GitHubFile.create(newPageName, content)
    await GitHubFile.delete(pageName, sha)

    res.status(200).json({ newPageName, content })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;