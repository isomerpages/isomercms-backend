const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import classes 
const { File, DataType } = require('../classes/File.js')

// List menus
async function listMenu (req, res, next) {
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
}

// Read menu
async function readMenu (req, res, next) {
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
}

// Update menu
async function updateMenu (req, res, next) {
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
}
router.get('/:siteName/menus', attachRouteHandlerWrapper(listMenu))
router.get('/:siteName/menus/:menuName', attachRouteHandlerWrapper(readMenu))
router.post('/:siteName/menus/:menuName', attachRouteHandlerWrapper(updateMenu))

module.exports = router;