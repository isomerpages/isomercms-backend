const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')
const Bluebird = require('bluebird')
const yaml = require('js-yaml');
const base64 = require('base-64');
const axios = require('axios')

const GITHUB_ORG_NAME = 'isomerpages'

// Import classes 
const { File, CollectionPageType } = require('../classes/File.js')

// List collections
router.get('/:siteName/collections', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    // validateStatus allows axios to handle a 404 HTTP status without rejecting the promise.
    // This is necessary because GitHub returns a 404 status when the file does not exist.
    const validateStatus = (status) => {
      return (status >= 200 && status < 300) || status === 404
    }

    const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/_config.yml`
    const resp = await axios.get(endpoint, {
      validateStatus: validateStatus,
      headers: {
        Authorization: `token ${access_token}`,
        "Content-Type": "application/json"
      }
    })

    if (resp.status === 404) throw new Error ('Page does not exist')

    const { content, sha } = resp.data
    const config = yaml.safeLoad(base64.decode(content))
    const collections = Object.keys(config.collections)

    res.status(200).json({ collections })

  } catch (err) {
    console.log(err)
  }
})

// Create new collection
router.post('/:siteName/collections', async function(req, res, next) {
  try {
    // TO-DO
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