const yaml = require('js-yaml')
const base64 = require('base-64')
const Bluebird = require('bluebird')
const _ = require('lodash')

const { Config } = require('./Config.js')
const { File, CollectionPageType } = require('./File.js')
const { Navigation } = require('./Navigation.js')
const { deslugifyCollectionName } = require('../utils/utils.js')

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
        permalink: '/:collection/:path/:title',
        output: true 
      }
      const newContent = base64.encode(yaml.safeDump(contentObject))

      await config.update(newContent, sha)

      const nav = new Navigation(this.accessToken, this.siteName)
      const { content:navContent, sha:navSha } = await nav.read()
      const navContentObject = yaml.safeLoad(base64.decode(navContent))

      navContentObject.links.push({ 
        title: deslugifyCollectionName(collectionName),
        collection: collectionName 
      })
      const newNavContent = base64.encode(yaml.safeDump(navContentObject))

      await nav.update(newNavContent, navSha)

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

      // Get all collectionPages
      const IsomerFile = new File(this.accessToken, this.siteName)
      const collectionPageType = new CollectionPageType(collectionName)
      IsomerFile.setFileType(collectionPageType)
      const collectionPages = await IsomerFile.list()

      if (!_.isEmpty(collectionPages)) {
        // Delete all collectionPages
        await Bluebird.map(collectionPages, async(collectionPage) => {
          let pageName = collectionPage.pageName
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
        permalink: '/:collection/:path/:title',
        output: true 
      }
      delete contentObject.collections[`${oldCollectionName}`]
      const newContent = base64.encode(yaml.safeDump(contentObject))

      await config.update(newContent, sha)

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