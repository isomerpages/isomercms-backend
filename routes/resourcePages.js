const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

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
    const resourcePageType = new ResourcePageType(resourceName)
    GitHubFile.setFileType(resourcePageType)
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
    const resourcePageType = new ResourcePageType(resourceName)
    GitHubFile.setFileType(resourcePageType)
    const { sha, content } = await GitHubFile.read(pageName)

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
    const resourcePageType = new ResourcePageType(resourceName)
    GitHubFile.setFileType(resourcePageType)
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
    const resourcePageType = new ResourcePageType(resourceName)
    GitHubFile.setFileType(resourcePageType)
    await GitHubFile.delete(pageName, sha)

    res.status(200).json({ resourceName, pageName, content })
  } catch (err) {
    console.log(err)
  }
})

// Rename page in resource
router.post('/:siteName/resources/:resourceName/pages/:pageName/rename/:newPageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, resourceName, newPageName } = req.params
    const { sha, content } = req.body

    // TO-DO:
    // Validate that resource exists
    // Validate pageName and content

    // Create new resource page with name ${newPageName}

    const GitHubFile = new File(access_token, siteName)
    const resourcePageType = new ResourcePageType(resourceName)
    GitHubFile.setFileType(resourcePageType)
    await GitHubFile.create(newPageName, content)
    await GitHubFile.delete(pageName, sha)

    res.status(200).json({ newPageName, content })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;