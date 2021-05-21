const yaml = require('yaml')
const Bluebird = require('bluebird')
const _ = require('lodash')

// Import Classes
const { Config } = require('./Config.js')
const { Resource } = require('../classes/Resource.js')
const { File, ResourceType, DataType } = require('../classes/File.js')
const { getCommitAndTreeSha, getTree, sendTree, deslugifyCollectionName } = require('../utils/utils.js')

// Constants
const RESOURCE_ROOM_INDEX_PATH = 'index.html'
const NAV_FILE_NAME = 'navigation.yml'

class ResourceRoom {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async get() {
    try {
    	const config = new Config(this.accessToken, this.siteName)
    	const { content } = await config.read()
    	const contentObject = yaml.parse(Base64.decode(content))

    	return contentObject.resources_name
    } catch (err) {
      throw err
    }
  }

  async create(resourceRoom) {
    try {
    	const config = new Config(this.accessToken, this.siteName)
    	const { content, sha } = await config.read()
    	const contentObject = yaml.parse(Base64.decode(content))

      contentObject.resources_name = resourceRoom

    	const newContent = Base64.encode(yaml.stringify(contentObject))

      // Create index file in resourceRoom
      const IsomerIndexFile = new File(this.accessToken, this.siteName)
      const resourceType = new ResourceType(resourceRoom)
      IsomerIndexFile.setFileType(resourceType)
      const resourceRoomObject = {
        layout: 'resources',
        title: deslugifyCollectionName(resourceRoom)
      }
      const resourceRoomFrontMatter = yaml.stringify(resourceRoomObject);
      const resourceRoomIndexContent = ['---\n', resourceRoomFrontMatter, '---'].join('');
      await IsomerIndexFile.create(RESOURCE_ROOM_INDEX_PATH, Base64.encode(resourceRoomIndexContent))

      await config.update(newContent, sha)

      const nav = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      nav.setFileType(dataType)
      const { content:navContent, sha:navSha } = await nav.read(NAV_FILE_NAME)
      const navContentObject = yaml.parse(Base64.decode(navContent))

      navContentObject.links.push({ 
        title: deslugifyCollectionName(resourceRoom),
        resource_room: true 
      })
      const newNavContent = Base64.encode(yaml.stringify(navContentObject))

      await nav.update(NAV_FILE_NAME, newNavContent, navSha)

      return resourceRoom
    } catch (err) {
      throw err
    }
  }

  async rename(newResourceRoom) {
    try {
      const commitMessage = `Rename resource room from ${resourceRoomName} to ${newResourceRoom}`
      // Add resource room to config
    	const config = new Config(this.accessToken, this.siteName)
    	const { content, sha } = await config.read()
    	const contentObject = yaml.parse(Base64.decode(content))

      // Obtain existing resourceRoomName
      const resourceRoomName = contentObject.resources_name
      contentObject.resources_name = newResourceRoom
      const newContent = Base64.encode(yaml.stringify(contentObject))
      
      // Rename resource room in nav if it exists
      const nav = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      nav.setFileType(dataType)
      const { content:navContent, sha:navSha } = await nav.read(NAV_FILE_NAME)
      const navContentObject = yaml.parse(Base64.decode(navContent))

      const newNavLinks = navContentObject.links.map(link => {
        if (link.resource_room === true) {
          return {
            title: deslugifyCollectionName(newResourceRoom),
            resource_room: true
          }
        } else {
          return link
        }
      })
      const newNavContentObject = {
        ...navContentObject,
        links: newNavLinks,
      }
      const newNavContent = Base64.encode(yaml.stringify(newNavContentObject))
      await nav.update(NAV_FILE_NAME, newNavContent, navSha)

      const { currentCommitSha, treeSha } = await getCommitAndTreeSha(this.siteName, this.accessToken)
      const gitTree = await getTree(this.siteName, this.accessToken, treeSha);
      const newGitTree = gitTree.map(item => {
        if (item.path === resourceRoomName) {
          return {
            ...item,
            path: newResourceRoom
          }
        } else {
          return item
        }
      })
      await sendTree(newGitTree, currentCommitSha, this.siteName, this.accessToken, commitMessage);

      await config.update(newContent, sha)

      return newResourceRoom
    } catch (err) {
      throw err
    }
  }

  async delete() {
    try {
    	// Delete resource in config
    	const config = new Config(this.accessToken, this.siteName)
    	const { content, sha } = await config.read()
    	const contentObject = yaml.parse(Base64.decode(content))

      // Obtain resourceRoomName
      const resourceRoomName = contentObject.resources_name

      // Delete resourcses_name from Config
    	delete contentObject.resources_name
      const newContent = Base64.encode(yaml.stringify(contentObject))
      
      // Delete resource room in nav if it exists
      const nav = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      nav.setFileType(dataType)
      const { content:navContent, sha:navSha } = await nav.read(NAV_FILE_NAME)
      const navContentObject = yaml.parse(Base64.decode(navContent))

      // Assumption: only a single resource room exists
      const newNavLinks = navContentObject.links.filter(link => link.resource_room !== true)
      const newNavContentObject = {
        ...navContentObject,
        links: newNavLinks,
      }
      const newNavContent = Base64.encode(yaml.stringify(newNavContentObject))
      await nav.update(NAV_FILE_NAME, newNavContent, navSha)

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