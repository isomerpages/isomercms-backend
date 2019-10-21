const yaml = require('js-yaml')
const base64 = require('base-64')
const Bluebird = require('bluebird')
const _ = require('lodash')

// Import Classes
const { Config } = require('./Config.js')
const { Resource } = require('../classes/Resource.js')
const { File, ResourceType } = require('../classes/File.js')

// Constants
const RESOURCE_ROOM_INDEX_PATH = 'index.html'
const RESOURCE_ROOM_INDEX_CONTENT = 'LS0tCmxheW91dDogcmVzb3VyY2VzCnRpdGxlOiBSZXNvdXJjZSBSb29tCi0tLQ=='

class ResourceRoom {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async get() {
    try {
    	const config = new Config(this.accessToken, this.siteName)
    	const { content } = await config.read()
    	const contentObject = yaml.safeLoad(base64.decode(content))

    	return contentObject.resources_name
    } catch (err) {
      throw err
    }
  }

  async create(resourceRoom) {
    try {
    	const config = new Config(this.accessToken, this.siteName)
    	const { content, sha } = await config.read()
    	const contentObject = yaml.safeLoad(base64.decode(content))

      contentObject.resources_name = resourceRoom

    	const newContent = base64.encode(yaml.safeDump(contentObject))

      // Create index file in resourceRoom
      const IsomerIndexFile = new File(this.accessToken, this.siteName)
      const resourceType = new ResourceType(resourceRoom)
      IsomerIndexFile.setFileType(resourceType)
      await IsomerIndexFile.create(RESOURCE_ROOM_INDEX_PATH, RESOURCE_ROOM_INDEX_CONTENT)

      await config.update(newContent, sha)

      return resourceRoom
    } catch (err) {
      throw err
    }
  }

  async rename(newResourceRoom) {
    try {
    	const config = new Config(this.accessToken, this.siteName)
    	const { content, sha } = await config.read()
    	const contentObject = yaml.safeLoad(base64.decode(content))

      // Obtain existing resourceRoomName
      const resourceRoomName = contentObject.resources_name
      contentObject.resources_name = newResourceRoom
    	const newContent = base64.encode(yaml.safeDump(contentObject))

      // Delete all resources and resourcePages
      const IsomerResource = new Resource(this.accessToken, this.siteName)
      const resources = await IsomerResource.list(resourceRoomName)

      // Create index file in resourceRoom
      const NewIsomerIndexFile = new File(this.accessToken, this.siteName)
      const newResourceType = new ResourceType(newResourceRoom)
      NewIsomerIndexFile.setFileType(newResourceType)
      await NewIsomerIndexFile.create(RESOURCE_ROOM_INDEX_PATH, RESOURCE_ROOM_INDEX_CONTENT)

      // Delete index file in resourceRoom
      const IsomerIndexFile = new File(this.accessToken, this.siteName)
      const resourceType = new ResourceType(resourceRoomName)
      IsomerIndexFile.setFileType(resourceType)
      const { sha: deleteSha } = await IsomerIndexFile.read(RESOURCE_ROOM_INDEX_PATH)
      await IsomerIndexFile.delete(RESOURCE_ROOM_INDEX_PATH, deleteSha)

      if (!_.isEmpty(resources)) {
        await Bluebird.map(resources, async(resource) => {
          return IsomerResource.rename(resourceRoomName, resource.dirName, newResourceRoom, resource.dirName)
        })
      }

      await config.update(newContent, sha)

      return newResourceRoom
    } catch (err) {
      throw err
    }
  }

  async delete() {
    try {
    	// Delete collection in config
    	const config = new Config(this.accessToken, this.siteName)
    	const { content, sha } = await config.read()
    	const contentObject = yaml.safeLoad(base64.decode(content))

      // Obtain resourceRoomName
      const resourceRoomName = contentObject.resources_name

      // Delete resourcses_name from Config
    	delete contentObject.resources_name
    	const newContent = base64.encode(yaml.safeDump(contentObject))

      // Delete all resources and resourcePages
      const IsomerResource = new Resource(this.accessToken, this.siteName)
      const resources = await IsomerResource.list(resourceRoomName)

      if (!_.isEmpty(resources)) {
        await Bluebird.map(resources, async(resource) => {
          return IsomerResource.delete(resourceRoomName, resource.dirName)
        })
      }

      // Delete index file in resourceRoom
      const IsomerIndexFile = new File(this.accessToken, this.siteName)
      const resourceType = new ResourceType(resourceRoomName)
      IsomerIndexFile.setFileType(resourceType)
      const { sha: deleteSha } = await IsomerIndexFile.read(RESOURCE_ROOM_INDEX_PATH)
      await IsomerIndexFile.delete(RESOURCE_ROOM_INDEX_PATH, deleteSha)

      await config.update(newContent, sha)

    } catch (err) {
      throw err
    }
  }
}

module.exports = { ResourceRoom }