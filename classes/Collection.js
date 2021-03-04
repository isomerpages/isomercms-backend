const yaml = require('js-yaml')
const base64 = require('base-64')
const Bluebird = require('bluebird')
const _ = require('lodash')

const { Config, CollectionConfig } = require('./Config.js')
const { File, CollectionPageType, DataType } = require('./File.js')
const { getCommitAndTreeSha, getTree, sendTree, deslugifyCollectionName } = require('../utils/utils.js')

const NAV_FILE_NAME = 'navigation.yml'

class Collection {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async list() {
    // to be removed in future PRs as collection data is no longer stored in _config.yml
    try {
      const config = new Config(this.accessToken, this.siteName)
      const { content, sha } = await config.read()
    const contentObject = yaml.safeLoad(base64.decode(content))
    const collections = contentObject.collections ? Object.keys(contentObject.collections) : []
    return collections
    } catch (err) {
      throw err
    }
  }

  async create(collectionName, orderArray) {
    try {
      const config = new CollectionConfig(this.accessToken, this.siteName, collectionName)
      const contentObject = {
        collections: {
          [collectionName]: {
            output: true,
            order: orderArray || [],
          },
        }
      }
      const newContent = base64.encode(yaml.safeDump(contentObject))
      await config.create(newContent)

      const nav = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      nav.setFileType(dataType)
      const { content:navContent, sha:navSha } = await nav.read(NAV_FILE_NAME)
      const navContentObject = yaml.safeLoad(base64.decode(navContent))

      navContentObject.links.push({ 
        title: deslugifyCollectionName(collectionName),
        collection: collectionName 
      })
      const newNavContent = base64.encode(yaml.safeDump(navContentObject))

      await nav.update(NAV_FILE_NAME, newNavContent, navSha)

    } catch (err) {
      throw err
    }
  }

  async delete(collectionName) {
    try {
      // Delete collection config
      const config = new CollectionConfig(this.accessToken, this.siteName, collectionName)
      const { sha } = await config.read()
      await config.delete(sha)

      // Delete collection in nav if it exists
      const nav = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      nav.setFileType(dataType)
      const { content:navContent, sha:navSha } = await nav.read(NAV_FILE_NAME)
      const navContentObject = yaml.safeLoad(base64.decode(navContent))

      const newNavLinks = navContentObject.links.filter(link => link.collection !== collectionName)
      const newNavContentObject = {
        ...navContentObject,
        links: newNavLinks,
      }
      const newNavContent = base64.encode(yaml.safeDump(newNavContentObject))
      await nav.update(NAV_FILE_NAME, newNavContent, navSha)

      // Get all collectionPages
      const IsomerFile = new File(this.accessToken, this.siteName)
      const collectionPageType = new CollectionPageType(collectionName)
      IsomerFile.setFileType(collectionPageType)
      const collectionPages = await IsomerFile.list()

      if (!_.isEmpty(collectionPages)) {
        // Delete all collectionPages
        await Bluebird.map(collectionPages, async(collectionPage) => {
          let pageName = collectionPage.fileName
          const { sha } = await IsomerFile.read(pageName)
          return IsomerFile.delete(pageName, sha)
        })
      }
    } catch (err) {
      throw err
    }
  }

  async rename(oldCollectionName, newCollectionName) {
    try {
      const commitMessage = `Rename collection from ${oldCollectionName} to ${newCollectionName}`
      // Rename collection in config
      const oldConfig = new CollectionConfig(this.accessToken, this.siteName, oldCollectionName)
      const { content: oldConfigContent, sha: oldConfigSha } = await oldConfig.read()
      const oldConfigContentObject = yaml.safeLoad(base64.decode(oldConfigContent))
      await oldConfig.delete(oldConfigSha)

      const newConfig = new CollectionConfig(this.accessToken, this.siteName, newCollectionName)
      const newConfigContentObject = {
        collections: {
          [newCollectionName]: oldConfigContentObject.collections[`${oldCollectionName}`]
        }
      }
      const newConfigContent = base64.encode(yaml.safeDump(newConfigContentObject))
      await newConfig.create(newConfigContent)

      // Rename collection in nav if it exists
      const nav = new File(this.accessToken, this.siteName)
      const dataType = new DataType()
      nav.setFileType(dataType)
      const { content:navContent, sha:navSha } = await nav.read(NAV_FILE_NAME)
      const navContentObject = yaml.safeLoad(base64.decode(navContent))

      const newNavLinks = navContentObject.links.map(link => {
        if (link.collection === oldCollectionName) {
          return {
            title: deslugifyCollectionName(newCollectionName),
            collection: newCollectionName 
          }
        } else {
          return link
        }
      })
      const newNavContentObject = {
        ...navContentObject,
        links: newNavLinks,
      }
      const newNavContent = base64.encode(yaml.safeDump(newNavContentObject))
      await nav.update(NAV_FILE_NAME, newNavContent, navSha)

      const { currentCommitSha, treeSha } = await getCommitAndTreeSha(this.siteName, this.accessToken)
      const gitTree = await getTree(this.siteName, this.accessToken, treeSha);
      const oldCollectionDirectoryName = `_${oldCollectionName}`
      const newCollectionDirectoryName = `_${newCollectionName}`
      const newGitTree = gitTree.map(item => {
        if (item.path === oldCollectionDirectoryName) {
          return {
            ...item,
            path: newCollectionDirectoryName
          }
        } else {
          return item
        }
      })
      await sendTree(newGitTree, currentCommitSha, this.siteName, this.accessToken, commitMessage);
    } catch (err) {
      throw err
    }
  }
}

module.exports = { Collection }