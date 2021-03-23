const express = require('express');
const router = express.Router();
const base64 = require('base-64');

// Import middleware
const {   
  attachReadRouteHandlerWrapper, 
  attachWriteRouteHandlerWrapper, 
  attachRollbackRouteHandlerWrapper 
} = require('../middleware/routeHandler')

// Import classes 
const { File, ResourcePageType } = require('../classes/File.js')
const { ResourceRoom } = require('../classes/ResourceRoom.js')
const { Resource } = require('../classes/Resource.js')

// List pages in resource
async function listResourcePages (req, res, next) {
  const { accessToken } = req
  const { siteName, resourceName } = req.params

  // TO-DO: Verify that resource exists
  const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()
  const IsomerFile = new File(accessToken, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  const resourcePages = await IsomerFile.list()

  res.status(200).json({ resourcePages })
}

// Create new page in resource
async function createNewResourcePage(req, res, next) {
  const { accessToken } = req

  const { siteName, resourceName } = req.params
  const { pageName, content } = req.body

  // TO-DO:
  // Validate pageName and content
  const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()

  // Check if resource category exists and create if it does not
  const IsomerResource = new Resource(accessToken, siteName)
  const resources = await IsomerResource.list(resourceRoomName)
  const resourceCategories = resources.map(resource => resource.dirName)
  if (!resourceCategories.includes(resourceName)) {
    await IsomerResource.create(resourceRoomName, resourceName)
  }

  const IsomerFile = new File(accessToken, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  const { sha } = await IsomerFile.create(pageName, content)

  res.status(200).json({ resourceName, pageName, content, sha })
}

// Read page in resource
async function readResourcePage (req, res, next) {
  const { accessToken } = req

  const { siteName, pageName, resourceName } = req.params

  const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()
  const IsomerFile = new File(accessToken, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  const { sha, content: encodedContent } = await IsomerFile.read(pageName)

  const content = Base64.decode(encodedContent)

  // TO-DO:
  // Validate content

  res.status(200).json({ resourceName, pageName, sha, content })
}

// Update page in resource
async function updateResourcePage (req, res, next) {
  const { accessToken } = req

    const { siteName, pageName, resourceName } = req.params
    const { content, sha } = req.body

    // TO-DO:
    // Validate pageName and content

    const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
    const resourceRoomName = await ResourceRoomInstance.get()
    const IsomerFile = new File(accessToken, siteName)
    const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
    IsomerFile.setFileType(resourcePageType)
    const { newSha } = await IsomerFile.update(pageName, content, sha)

    res.status(200).json({ resourceName, pageName, content, sha: newSha })
}

// Delete page in resource
async function deleteResourcePage(req, res, next) {
  const { accessToken } = req

  const { siteName, pageName, resourceName } = req.params
  const { sha } = req.body

  const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()
  const IsomerFile = new File(accessToken, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  const resources = await IsomerFile.list()
  if (resources.length === 1) {
    // If there is only 1 page left, we can delete the entire category
    const IsomerResource = new Resource(accessToken, siteName)
    await IsomerResource.delete(resourceRoomName, resourceName)
  } else {
    await IsomerFile.delete(pageName, sha)
  }

  res.status(200).send('OK')
}

// Rename page in resource
async function renameResourcePage (req, res, next) {
  const { accessToken } = req

  const { siteName, pageName, resourceName, newPageName } = req.params
  const { sha, content } = req.body

  // TO-DO:
  // Validate that resource exists
  // Validate pageName and content

  // Create new resource page with name ${newPageName}

  const ResourceRoomInstance = new ResourceRoom(accessToken, siteName)
  const resourceRoomName = await ResourceRoomInstance.get()
  const IsomerFile = new File(accessToken, siteName)
  const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
  IsomerFile.setFileType(resourcePageType)
  const { sha: newSha } = await IsomerFile.create(newPageName, content)
  await IsomerFile.delete(pageName, sha)

  res.status(200).json({ resourceName, pageName: newPageName, content, sha: newSha })
}
router.get('/:siteName/resources/:resourceName', attachReadRouteHandlerWrapper(listResourcePages))
router.post('/:siteName/resources/:resourceName/pages', attachRollbackRouteHandlerWrapper(createNewResourcePage))
router.get('/:siteName/resources/:resourceName/pages/:pageName', attachReadRouteHandlerWrapper(readResourcePage))
router.post('/:siteName/resources/:resourceName/pages/:pageName', attachWriteRouteHandlerWrapper(updateResourcePage))
router.delete('/:siteName/resources/:resourceName/pages/:pageName', attachRollbackRouteHandlerWrapper(deleteResourcePage))
router.post('/:siteName/resources/:resourceName/pages/:pageName/rename/:newPageName', attachRollbackRouteHandlerWrapper(renameResourcePage))

module.exports = router;