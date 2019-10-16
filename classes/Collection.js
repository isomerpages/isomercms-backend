const yaml = require('js-yaml')
const base64 = require('base-64')
const Bluebird = require('bluebird')
const _ = require('lodash')

const { Config } = require('./Config.js')
const { File, CollectionPageType } = require('./File.js')

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

    	return Object.keys(contentObject.collections)

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
	    const GitHubFile = new File(this.accessToken, this.siteName)
	    const collectionPageType = new CollectionPageType(collectionName)
	    GitHubFile.setFileType(collectionPageType)
			const collectionPages = await GitHubFile.list()

	    // Delete all collectionPages
	    await Bluebird.map(collectionPages, async(collectionPage) => {
	      let pageName = collectionPage.pageName
	      const { sha } = await GitHubFile.read(pageName)
	      return GitHubFile.delete(pageName, sha)
	    })

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
	    const OldGitHubFile = new File(this.accessToken, this.siteName)
	    const oldCollectionPageType = new CollectionPageType(oldCollectionName)
	    OldGitHubFile.setFileType(oldCollectionPageType)
			const collectionPages = await OldGitHubFile.list()
			
			// If the object is empty (there are no pages in the collection), do nothing
			if (_.isEmpty(collectionPages)) return 

	    // Set up new collection File instance
	    const NewGitHubFile = new File(this.accessToken, this.siteName)
	    const newCollectionPageType = new CollectionPageType(newCollectionName)
	    NewGitHubFile.setFileType(newCollectionPageType)

	    // Rename all collectionPages
	    await Bluebird.map(collectionPages, async(collectionPage) => {
	      let pageName = collectionPage.fileName
				const { content, sha } = await OldGitHubFile.read(pageName)
				await OldGitHubFile.delete(pageName, sha)
	      return NewGitHubFile.create(pageName, content)
			})
			
    } catch (err) {
      throw err
    }
  }
}

module.exports = { Collection }