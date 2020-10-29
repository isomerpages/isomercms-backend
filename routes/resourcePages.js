const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import classes 
const { File, ResourcePageType } = require('../classes/File.js')
const { ResourceRoom } = require('../classes/ResourceRoom.js')

// List pages in resource
async function listResourcePages (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)
  const { siteName, resourceName } = req.params

  // TO-DO: Verify that resource exists
  const ResourceRoomInstance = new ResourceRoom(access_token, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()
  const IsomerFile = new File(access_token, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  const resourcePages = await IsomerFile.list()

  res.status(200).json({ resourcePages })
}

// Create new page in resource
async function createNewResourcePage(req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)

  const { siteName, resourceName } = req.params
  const { pageName, content } = req.body

  // TO-DO:
  // Validate pageName and content

  const ResourceRoomInstance = new ResourceRoom(access_token, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()
  const IsomerFile = new File(access_token, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  const { sha } = await IsomerFile.create(pageName, content)

  res.status(200).json({ resourceName, pageName, content, sha })
}

// Read page in resource
async function readResourcePage (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)

  const { siteName, pageName, resourceName } = req.params

  const ResourceRoomInstance = new ResourceRoom(access_token, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()
  const IsomerFile = new File(access_token, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  const { sha, content } = await IsomerFile.read(pageName)

  // TO-DO:
  // Validate content

  res.status(200).json({ resourceName, pageName, sha, content })
}

// Update page in resource
async function updateResourcePage (req, res, next) {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, resourceName } = req.params
    const { content, sha } = req.body

    // TO-DO:
    // Validate pageName and content

    const ResourceRoomInstance = new ResourceRoom(access_token, siteName)
    const resourceRoomName = await ResourceRoomInstance.get()
    const IsomerFile = new File(access_token, siteName)
    const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
    IsomerFile.setFileType(resourcePageType)
    const { newSha } = await IsomerFile.update(pageName, content, sha)

    res.status(200).json({ resourceName, pageName, content, sha: newSha })
}

// Delete page in resource
async function deleteResourcePage(req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)

  const { siteName, pageName, resourceName } = req.params
  const { sha } = req.body

  const ResourceRoomInstance = new ResourceRoom(access_token, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()
  const IsomerFile = new File(access_token, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  await IsomerFile.delete(pageName, sha)

  res.status(200).send('OK')
}

// Rename page in resource
async function renameResourcePage (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)

  const { siteName, pageName, resourceName, newPageName } = req.params
  const { sha, content } = req.body

  // TO-DO:
  // Validate that resource exists
  // Validate pageName and content

  // Create new resource page with name ${newPageName}

  const ResourceRoomInstance = new ResourceRoom(access_token, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()
  const IsomerFile = new File(access_token, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  const { sha: newSha } = await IsomerFile.create(newPageName, content)
  await IsomerFile.delete(pageName, sha)

  res.status(200).json({ resourceName, pageName: newPageName, content, sha: newSha })
}
router.get('/:siteName/resources/:resourceName', attachRouteHandlerWrapper(listResourcePages))
router.post('/:siteName/resources/:resourceName/pages', attachRouteHandlerWrapper(createNewResourcePage))
router.get('/:siteName/resources/:resourceName/pages/:pageName', attachRouteHandlerWrapper(readResourcePage))
router.post('/:siteName/resources/:resourceName/pages/:pageName', attachRouteHandlerWrapper(updateResourcePage))
router.delete('/:siteName/resources/:resourceName/pages/:pageName', attachRouteHandlerWrapper(deleteResourcePage))
router.post('/:siteName/resources/:resourceName/pages/:pageName/rename/:newPageName', attachRouteHandlerWrapper(renameResourcePage))

module.exports = router;