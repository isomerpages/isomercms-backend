const Bluebird = require('bluebird')
const _ = require('lodash')

// Import classes 
const { File, ResourceCategoryType, ResourcePageType } = require('../classes/File.js')
const { Directory, ResourceRoomType } = require('../classes/Directory.js')

// Constants
const RESOURCE_INDEX_PATH = 'index.html'
const RESOURCE_INDEX_CONTENT = 'LS0tCmxheW91dDogcmVzb3VyY2VzLWFsdAp0aXRsZTogUmVzb3VyY2UgUm9vbQotLS0='

class Resource {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async list(resourceRoomName) {
    try {
      const IsomerDir = new Directory(this.accessToken, this.siteName)
      const resourceRoomType = new ResourceRoomType(resourceRoomName)
      IsomerDir.setDirType(resourceRoomType)
      return IsomerDir.list()
    } catch (err) {
      throw err
    }
  }

  async create(resourceRoomName, resourceName) {
    try {
      // Create an index file in the resource folder
      const IsomerFile = new File(this.accessToken, this.siteName)
      const resourceType = new ResourceCategoryType(resourceRoomName, resourceName)
      IsomerFile.setFileType(resourceType)
      return IsomerFile.create(`${RESOURCE_INDEX_PATH}`, RESOURCE_INDEX_CONTENT)
    } catch (err) {
      throw err
    }
  }

  async rename(resourceRoomName, resourceName, newResourceRoomName, newResourceName) {
    try {
      // Delete old index file in old resource
      const OldIsomerIndexFile = new File(this.accessToken, this.siteName)
      const resourceType = new ResourceCategoryType(resourceRoomName, resourceName)
      OldIsomerIndexFile.setFileType(resourceType)
      const { sha: oldSha } = await OldIsomerIndexFile.read(`${RESOURCE_INDEX_PATH}`)
      await OldIsomerIndexFile.delete(`${RESOURCE_INDEX_PATH}`, oldSha)

      // Create new index file in new resource
      const NewIsomerIndexFile = new File(this.accessToken, this.siteName)
      const newResourceType = new ResourceCategoryType(newResourceRoomName, newResourceName)
      NewIsomerIndexFile.setFileType(newResourceType)
      await NewIsomerIndexFile.create(`${RESOURCE_INDEX_PATH}`, RESOURCE_INDEX_CONTENT)

      // Rename resourcePages
      const OldIsomerFile = new File(this.accessToken, this.siteName)
      const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
      OldIsomerFile.setFileType(resourcePageType)

      const NewIsomerFile = new File(this.accessToken, this.siteName)
      const newResourcePageType = new ResourcePageType(newResourceRoomName, newResourceName)
      NewIsomerFile.setFileType(newResourcePageType)

      // 1. List all resourcePages in old resource
      const resourcePages = await OldIsomerFile.list()

      if (_.isEmpty(resourcePages)) return

      await Bluebird.each(resourcePages, async(resourcePage) => {
        // 2. Create new resourcePages in newResource
        const { content, sha } = await OldIsomerFile.read(resourcePage.fileName)
        await NewIsomerFile.create(resourcePage.fileName, content)
        // 3. Delete all resourcePages in resource
        return OldIsomerFile.delete(resourcePage.fileName, sha)
      })
    } catch (err) {
      throw err
    }
  }

  async delete(resourceRoomName, resourceName) {
    try {
      // Delete index file in resource
      const IsomerIndexFile = new File(this.accessToken, this.siteName)
      const resourceType = new ResourceCategoryType(resourceRoomName, resourceName)
      IsomerIndexFile.setFileType(resourceType)
      const { sha } = await IsomerIndexFile.read(`${RESOURCE_INDEX_PATH}`)
      await IsomerIndexFile.delete(`${RESOURCE_INDEX_PATH}`, sha)

      // Delete all resourcePages in resource
      // 1. List all resourcePages in resource
      const IsomerFile = new File(this.accessToken, this.siteName)
      const resourcePageType = new ResourcePageType(resourceRoomName, resourceName)
      IsomerFile.setFileType(resourcePageType)
      const resourcePages = await IsomerFile.list()

      if (_.isEmpty(resourcePages)) return

      // 2. Delete all resourcePages in resource
      await Bluebird.each(resourcePages, async(resourcePage) => {
        const { sha } = await IsomerFile.read(resourcePage.fileName)
        return IsomerFile.delete(resourcePage.fileName, sha)
      })
    } catch (err) {
      throw err
    }
  }
}

module.exports = { Resource }