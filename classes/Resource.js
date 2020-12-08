const Bluebird = require('bluebird')
const _ = require('lodash')

// Import classes 
const { File, ResourceCategoryType, ResourcePageType } = require('../classes/File.js')
const { Directory, ResourceRoomType } = require('../classes/Directory.js')
const { getCommitAndTreeSha, getTree, sendTree } = require('../utils/utils.js')

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

  async rename(resourceRoomName, resourceName, newResourceName) {
    try {
      const commitMessage = `Rename resource category from ${resourceName} to ${newResourceName}`
      const { currentCommitSha, treeSha } = await getCommitAndTreeSha(this.siteName, this.accessToken)
      const gitTree = await getTree(this.siteName, this.accessToken, treeSha);
      let newGitTree = []
      let resourceRoomTreeSha
      // Retrieve all git trees of other items
      gitTree.forEach((item) => {
        if (item.path === resourceRoomName) {
          resourceRoomTreeSha = item.sha
        } else {
          newGitTree.push(item)
        }
      })
      const resourceRoomTree = await getTree(this.siteName, this.accessToken, resourceRoomTreeSha)
      resourceRoomTree.forEach(item => {
        // We need to append resource room to the file path because the path is relative to the subtree
        if (item.path === resourceName) {
          newGitTree.push({
            ...item,
            path: `${resourceRoomName}/${newResourceName}`
          })
        } else {
          newGitTree.push({
            ...item,
            path: `${resourceRoomName}/${item.path}`
          })
        }
      })
      await sendTree(newGitTree, currentCommitSha, this.siteName, this.accessToken, commitMessage);
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