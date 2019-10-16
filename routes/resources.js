const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import classes 
const { File, ResourcePageType } = require('../classes/File.js')

// List resources
router.get('/:siteName/resources', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Create new resource
router.post('/:siteName/resources', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// List pages in resource
router.get('/:siteName/resources/:resourceName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName, resourceName } = req.params

    // TO-DO: Verify that resource exists

    const GitHubFile = new File(access_token, siteName)
    const resourcePageType = new ResourcePageType(resourceName)
    GitHubFile.setFileType(resourcePageType)
    const resourcePages = await GitHubFile.list()

    res.status(200).json({ resourcePages })
  } catch (err) {
    console.log(err)
  }
})

// Delete resource
router.delete('/:siteName/resources/:resourceName', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

// Rename resource
router.post('/:siteName/resources/:resourceName/rename', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;