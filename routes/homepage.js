const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import classes 
const { File, HomepageType } = require('../classes/File.js')

// Constants
const HOMEPAGE_INDEX_PATH = '' // Empty string

// Read homepage index file
router.get('/:siteName/homepage', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName } = req.params

    const IsomerFile = new File(access_token, siteName)
    const homepageType =  new HomepageType()
    IsomerFile.setFileType(homepageType)
    const { sha, content } = await IsomerFile.read(HOMEPAGE_INDEX_PATH)

    // TO-DO:
    // Validate content

    res.status(200).json({ content, sha })
  } catch (err) {
    console.log(err)
  }
})

// Update homepage index file
router.post('/:siteName/homepage', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName } = req.params
    const { content, sha } = req.body

    // TO-DO:
    // Validate content

    const IsomerFile = new File(access_token, siteName)
    const homepageType =  new HomepageType()
    IsomerFile.setFileType(homepageType)
    const { newSha } = await IsomerFile.update(HOMEPAGE_INDEX_PATH, content, sha)

    res.status(200).json({ content, sha: newSha })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;