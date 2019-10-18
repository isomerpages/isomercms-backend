const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import classes 
const { File, DataType } = require('../classes/File.js')

// List menus
router.get('/:siteName/menus', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName } = req.params

    const IsomerFile = new File(access_token, siteName)
    const dataType =  new DataType()
    IsomerFile.setFileType(dataType)
    const menus = await IsomerFile.list()

    // TO-DO:
    // Validate content

    res.status(200).json({ menus })
  } catch (err) {
    console.log(err)
  }
})

// Read menu
router.get('/:siteName/menus/:menuName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, menuName } = req.params

    const IsomerFile = new File(access_token, siteName)
    const dataType =  new DataType()
    IsomerFile.setFileType(dataType)
    const { sha, content } = await IsomerFile.read(menuName)

    // TO-DO:
    // Validate content

    res.status(200).json({ menuName, sha, content })
  } catch (err) {
    console.log(err)
  }
})

// Update menu
router.post('/:siteName/menus/:menuName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, menuName } = req.params
    const { content, sha } = req.body

    // TO-DO:
    // Validate menuName and content

    const IsomerFile = new File(access_token, siteName)
    const dataType =  new DataType()
    IsomerFile.setFileType(dataType)
    const { newSha } = await IsomerFile.update(menuName, content, sha)

    res.status(200).json({ menuName, content, sha: newSha })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;