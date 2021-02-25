const express = require('express');
const router = express.Router();

// Import middleware
const { 
  attachReadRouteHandlerWrapper, 
  attachWriteRouteHandlerWrapper,
} = require('../middleware/routeHandler')


// Import classes 
const { File, DataType } = require('../classes/File.js')

// List menus
async function listMenu (req, res, next) {
  const { accessToken } = req

  const { siteName } = req.params

  const IsomerFile = new File(accessToken, siteName)
  const dataType =  new DataType()
  IsomerFile.setFileType(dataType)
  const menus = await IsomerFile.list()

  // TO-DO:
  // Validate content

  res.status(200).json({ menus })
}

// Read menu
async function readMenu (req, res, next) {
  const { accessToken } = req

  const { siteName, menuName } = req.params

  const IsomerFile = new File(accessToken, siteName)
  const dataType =  new DataType()
  IsomerFile.setFileType(dataType)
  const { sha, content } = await IsomerFile.read(menuName)

  // TO-DO:
  // Validate content

  res.status(200).json({ menuName, sha, content })
}

// Update menu
async function updateMenu (req, res, next) {
  const { accessToken } = req

  const { siteName, menuName } = req.params
  const { content, sha } = req.body

  // TO-DO:
  // Validate menuName and content

  const IsomerFile = new File(accessToken, siteName)
  const dataType =  new DataType()
  IsomerFile.setFileType(dataType)
  const { newSha } = await IsomerFile.update(menuName, content, sha)

  res.status(200).json({ menuName, content, sha: newSha })
}
router.get('/:siteName/menus', attachReadRouteHandlerWrapper(listMenu))
router.get('/:siteName/menus/:menuName', attachReadRouteHandlerWrapper(readMenu))
router.post('/:siteName/menus/:menuName', attachWriteRouteHandlerWrapper(updateMenu))

module.exports = router;