const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')
const Bluebird = require('bluebird')

// Import classes 
const { File, ResourceType, ResourcePageType } = require('../classes/File.js')
const { ResourceRoom } = require('../classes/ResourceRoom.js')

// Constants
const RESOURCE_INDEX_PATH = 'index.html'
const RESOURCE_INDEX_CONTENT = 'LS0tCmxheW91dDogcmVzb3VyY2VzLWFsdAp0aXRsZTogUmVzb3VyY2UgUm9vbQotLS0='
const RESOURCE_INDEX_CONTENT_SHA = 'c89773cd987d47dab7bdcc166e8639c65b340298'

// List resources
router.get('/:siteName/resources', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const ResourceRoomInstance = new ResourceRoom(access_token, siteName)
    const resourceRoomName = await ResourceRoomInstance.get()

    const IsomerFile = new File(access_token, siteName, resourceRoomName)
    const resourceType = new ResourceType(resourceRoomName)
    IsomerFile.setFileType(resourceType)
    const resources = await IsomerFile.list()

    res.status(200).json({ resources })
  } catch (err) {
    console.log(err)
  }
})

// Create new resource
router.post('/:siteName/resources', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params
    const { resourceName } = req.body

    const ResourceRoomInstance = new ResourceRoom(access_token, siteName)
    const resourceRoomName = await ResourceRoomInstance.get()

    // Create an index file in the resource folder
    const IsomerFile = new File(access_token, siteName, resourceRoomName)
    const resourceType = new ResourceType(resourceRoomName)
    IsomerFile.setFileType(resourceType)
    const { sha } = await IsomerFile.create(`${resourceName}/${RESOURCE_INDEX_PATH}`, RESOURCE_INDEX_CONTENT)

    res.status(200).json({ resourceName, sha })
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

    const IsomerFile = new File(access_token, siteName)
    const resourcePageType = new ResourcePageType(resourceName)
    IsomerFile.setFileType(resourcePageType)
    const resourcePages = await IsomerFile.list()

    res.status(200).json({ resourcePages })
  } catch (err) {
    console.log(err)
  }
})

// Delete resource
router.delete('/:siteName/resources/:resourceName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName, resourceName } = req.params

    const ResourceRoomInstance = new ResourceRoom(access_token, siteName)
    const resourceRoomName = await ResourceRoomInstance.get()

    // Delete index file in resource
    const IsomerIndexFile = new File(access_token, siteName, resourceRoomName)
    const resourceType = new ResourceType(resourceRoomName)
    IsomerIndexFile.setFileType(resourceType)
    await IsomerIndexFile.delete(`${resourceName}/${RESOURCE_INDEX_PATH}`, RESOURCE_INDEX_CONTENT_SHA)

    // Delete all resourcePages in resource
    // 1. List all resourcePages in resource
    const IsomerFile = new File(access_token, siteName)
    const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
    IsomerFile.setFileType(resourcePageType)
    const resourcePages = await IsomerFile.list()

    // 2. Delete all resourcePages in resource
    await Bluebird.map(resourcePages, async(resourcePage) => {
      return IsomerFile.delete(resourcePage.fileName, RESOURCE_INDEX_CONTENT)
    })

    res.status(200).send('OK')
  } catch (err) {
    console.log(err)
  }
})

// Rename resource
router.post('/:siteName/resources/:resourceName/rename/:newResourceName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName, resourceName, newResourceName } = req.params

    const ResourceRoomInstance = new ResourceRoom(access_token, siteName)
    const resourceRoomName = await ResourceRoomInstance.get()

    // Create index file in resource
    const IsomerIndexFile = new File(access_token, siteName, resourceRoomName)
    const resourceType = new ResourceType(resourceRoomName)
    IsomerIndexFile.setFileType(resourceType)
    await IsomerIndexFile.create(`${newResourceName}/${RESOURCE_INDEX_PATH}`, RESOURCE_INDEX_CONTENT_SHA)
    // Delete index file in old resource
    await IsomerIndexFile.delete(`${resourceName}/${RESOURCE_INDEX_PATH}`, RESOURCE_INDEX_CONTENT_SHA)

    // Rename resourcePages
    const OldIsomerFile = new File(access_token, siteName)
    const NewIsomerFile = new File(access_token, siteName)
    const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
    const newResourcePageType = new ResourcePageType(newResourceRoomName, resourceName)
    OldIsomerFile.setFileType(resourcePageType)
    NewIsomerFile.setFileType(newResourcePageType)

    // 1. List all resourcePages in resource
    const resourcePages = await OldIsomerFile.list()

    await Bluebird.map(resourcePages, async(resourcePage) => {
      // 2. Create new resourcePages in newResource
      const { content, sha } = await OldIsomerFile.read(resourcePage.fileName)
      await NewIsomerFile.create(resourcePage.fileName, content)
      // 3. Delete all resourcePages in resource
      return OldIsomerFile.delete(resourcePage.fileName, sha)
    })

  } catch (err) {
    console.log(err)
  }
})

module.exports = router;