const express = require('express');
const router = express.Router();
const axios = require('axios');
const base64 = require('base-64');
const jwtUtils = require('../utils/jwt-utils')
const _ = require('lodash')

// Import classes 
const { File, ResourcePageType } = require('../classes/File.js')

// Create new page in resource
router.post('/:siteName/resources/:resourceName/pages', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, resourceName } = req.params
    const { pageName, content } = req.body

    // TO-DO:
    // Validate that resource exists
    // Validate pageName and content

    const GitHubFile = new File(access_token, siteName)
    GitHubFile.setFileType(ResourcePageType(resourceName))
    await GitHubFile.create(pageName, content)

    res.status(200).json({ resourceName, pageName, content })
  } catch (err) {
    console.log(err)
  }
})

// Read page in resource
router.get('/:siteName/resources/:resourceName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, resourceName } = req.params

    const GitHubFile = new File(access_token, siteName)
    GitHubFile.setFileType(ResourcePageType(resourceName))
    const { sha, content } = await GitHubFile.read(pageName)

    const content = resp.data.content
    const sha = resp.data.sha

    // TO-DO:
    // Validate content

    res.status(200).json({ resourceName, pageName, sha, content })
  } catch (err) {
    console.log(err)
  }
})

// Update page in resource
router.post('/:siteName/resources/:resourceName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, resourceName } = req.params
    const { content, sha } = req.body

    // TO-DO:
    // Validate pageName and content

    const GitHubFile = new File(access_token, siteName)
    GitHubFile.setFileType(ResourcePageType(resourceName))
    await GitHubFile.update(pageName, content, sha)

    res.status(200).json({ pageName, content })
  } catch (err) {
    console.log(err)
  }
})

// Delete page in resource
router.delete('/:siteName/resources/:resourceName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, resourceName } = req.params
    const { sha } = req.body

    const GitHubFile = new File(access_token, siteName)
    GitHubFile.setFileType(ResourcePageType(resourceName))
    await GitHubFile.delete(pageName, sha)

    res.status(200).json({ resourceName, pageName, content })
  } catch (err) {
    console.log(err)
  }
})

// Rename page in resource
router.post('/:siteName/resources/:resourceName/pages/:pageName/rename', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, resourceName } = req.params
    const { newPageName, sha, content } = req.body

    // TO-DO:
    // Validate that resource exists
    // Validate pageName and content

    // Create new resource page with name ${newPageName}

    const GitHubFile = new File(access_token, siteName)
    GitHubFile.setFileType(ResourcePageType(resourceName))
    await GitHubFile.create(newPageName, content)
    await GitHubFile.delete(pageName, sha)

    res.status(200).json({ newPageName, content })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;