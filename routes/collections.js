const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

const GITHUB_ORG_NAME = 'isomerpages'

// Import classes 
const { File, CollectionPageType } = require('../classes/File.js')
const { Config, CollectionType } = require('../classes/Config.js')

// List collections
router.get('/:siteName/collections', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const GitHubConfig = new Config(access_token, siteName)
    const collectionType = new CollectionType()
    GitHubConfig.setConfigType(collectionType)
    const collections = await GitHubConfig.read()

    res.status(200).json({ collections })

  } catch (err) {
    console.log(err)
  }
})

// Create new collection
router.post('/:siteName/collections', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params
    const { collectionName } = req.body

    // TO-DO: Verify that collection doesn't already exist
    
    const GitHubConfig = new Config(access_token, siteName)
    const collectionType = new CollectionType()
    GitHubConfig.setConfigType(collectionType)
    await GitHubConfig.add(collectionName)

  } catch (err) {
    console.log(err)
  }
})

// List pages in collection
router.get('/:siteName/collections/:collectionName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName, collectionName } = req.params

    // TO-DO: Verify that collection exists

    const GitHubFile = new File(access_token, siteName)
    const collectionPageType = new CollectionPageType(collectionName)
    GitHubFile.setFileType(collectionPageType)
    const collectionPages = await GitHubFile.list()

    res.status(200).json({ collectionPages })

  } catch (err) {
    console.log(err)
  }
})

// Delete collection
router.delete('/:siteName/collections/:collectionName', async function(req, res, next) {
  try {
    // TO-DO: Verify that collection exists

    // Remove collection from config file
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params
    const { collectionName } = req.body

    const GitHubConfig = new Config(access_token, siteName)
    const collectionType = new CollectionType()
    GitHubConfig.setConfigType(collectionType)
    await GitHubConfig.delete(collectionName)

    // Get all collectionPages
    const GitHubFile = new File(access_token, siteName)
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
    console.log(err)
  }
})

// Rename collection
router.post('/:siteName/collections/:collectionName/rename', async function(req, res, next) {
  try {
    // TO-DO
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;