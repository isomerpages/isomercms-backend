const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import classes 
const { File, DataType } = require('../classes/File.js')

const NAVIGATION_PATH = 'navigation.yml'

// Read navigation
router.get('/:siteName/navigation', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName } = req.params

    const GitHubFile = new File(access_token, siteName)
    const dataType =  new DataType()
    GitHubFile.setFileType(dataType)
    const { sha, content } = await GitHubFile.read(NAVIGATION_PATH)

    // TO-DO:
    // Validate content

    res.status(200).json({ sha, content })
  } catch (err) {
    console.log(err)
  }
})

// Update navigation
router.post('/:siteName/navigation', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName } = req.params
    const { content, sha } = req.body

    // TO-DO:
    // Validate imageName and content

    const GitHubFile = new File(access_token, siteName)
    const dataType =  new DataType()
    GitHubFile.setFileType(dataType)
    await GitHubFile.update(NAVIGATION_PATH, content, sha)

    res.status(200).json({ content })
  } catch (err) {
    console.log(err)
  }
})