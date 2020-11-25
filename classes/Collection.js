const yaml = require('js-yaml')
const base64 = require('base-64')
const Bluebird = require('bluebird')
const _ = require('lodash')

const { Config } = require('./Config.js')
const { File, CollectionPageType, DataType } = require('./File.js')
const { deslugifyCollectionName } = require('../utils/utils.js')

const NAV_FILE_NAME = 'navigation.yml'

class Collection {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async list() {
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

  async create(collectionName) {
    try {
      const config = new Config(this.accessToken, this.siteName)
      const { content, sha } = await config.read()
      const contentObject = yaml.safeLoad(base64.decode(content))

      // TO-DO: Verify that collection doesn't already exist

      contentObject.collections[`${collectionName}`] = {
        output: true 
      }
      const newContent = base64.encode(yaml.safeDump(contentObject))

      await config.update(newContent, sha)

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
      // Delete collection in config
      const config = new Config(this.accessToken, this.siteName)
      const { content, sha } = await config.read()
      const contentObject = yaml.safeLoad(base64.decode(content))

      delete contentObject.collections[`${collectionName}`]
      const newContent = base64.encode(yaml.safeDump(contentObject))

      await config.update(newContent, sha)

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
      // Rename collection in config
      const config = new Config(this.accessToken, this.siteName)
      const { content, sha } = await config.read()
      const contentObject = yaml.safeLoad(base64.decode(content))

      contentObject.collections[`${newCollectionName}`] = {
        output: true 
      }
      delete contentObject.collections[`${oldCollectionName}`]
      const newContent = base64.encode(yaml.safeDump(contentObject))

      await config.update(newContent, sha)

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

      // Get all collectionPages
      const OldIsomerFile = new File(this.accessToken, this.siteName)
      const oldCollectionPageType = new CollectionPageType(oldCollectionName)
      OldIsomerFile.setFileType(oldCollectionPageType)
      const collectionPages = await OldIsomerFile.list()
      
      // If the object is empty (there are no pages in the collection), do nothing
      if (_.isEmpty(collectionPages)) return 

      // Set up new collection File instance
      const NewIsomerFile = new File(this.accessToken, this.siteName)
      const newCollectionPageType = new CollectionPageType(newCollectionName)
      NewIsomerFile.setFileType(newCollectionPageType)

      // Rename all collectionPages
      await Bluebird.map(collectionPages, async(collectionPage) => {
        let pageName = collectionPage.fileName
        const { content, sha } = await OldIsomerFile.read(pageName)
        await OldIsomerFile.delete(pageName, sha)
        return NewIsomerFile.create(pageName, content)
      })
      
    } catch (err) {
      throw err
    }
  }
}

module.exports = { Collection }