const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')
const Bluebird = require('bluebird')
const _ = require('lodash')

// Import classes
const { File, PageType, CollectionPageType } = require('../classes/File.js')
const { Collection } = require('../classes/Collection.js')

// List both simple pages and collection pages
router.get('/:siteName/pages', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const IsomerFile = new File(access_token, siteName)
    const pageType = new PageType()
    IsomerFile.setFileType(pageType)
    let simplePages = await IsomerFile.list()
    // After listing all simple pages, they're tagged for the frontend
    simplePages = simplePages.map(simplePage => {
      return {
        ...simplePage,
        type: 'simple-page'
      }
    })

    const IsomerCollection = new Collection(access_token, siteName)
    const collections = await IsomerCollection.list() //lists out all collections

    /**
     * This `reduce` function will:
     * 1) Iterate through the collections
     *  a) Lists all the collection pages with `CollectionPage.list()`
     *  b) Map it to tag it with type `collection` [for frontend to know]
     * 2) Concatenate it into the `accumulator`
     * This then returns a flattened array of all collections pages from all collections (`allCollectionPages`)
     */
    const allCollectionPages = await Bluebird.reduce(collections, async (accumulator, collectionName) => {
      const CollectionPage = new File(access_token, siteName)
      const collectionPageType = new CollectionPageType(collectionName)
      CollectionPage.setFileType(collectionPageType)
      const collectionPages = await CollectionPage.list()
      if (_.isEmpty(collectionPages)) {
        return accumulator
      }
      const collectionPagesWithType = collectionPages.map((item) => ({ ...item, type: 'collection', collectionName })) // tagged with type for frontend

      return accumulator.concat(collectionPagesWithType)
    }, [])

    const pages = simplePages.concat(allCollectionPages); // collection pages are then concatenated with simple pages
    res.status(200).json({ pages })
  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

// Create new page
router.post('/:siteName/pages', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName } = req.params
    const { pageName, content } = req.body

    // TO-DO:
    // Validate pageName and content

    const IsomerFile = new File(access_token, siteName)
    const pageType = new PageType()
    IsomerFile.setFileType(pageType)
    const { sha } = await IsomerFile.create(pageName, content)

    res.status(200).json({ pageName, content, sha })

  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

// Read page
router.get('/:siteName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName } = req.params

    const IsomerFile = new File(access_token, siteName)
    const pageType = new PageType()
    IsomerFile.setFileType(pageType)
    const { sha, content } = await IsomerFile.read(pageName)

    // TO-DO:
    // Validate content

    res.status(200).json({ pageName, sha, content })

  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

// Update page
router.post('/:siteName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName } = req.params
    const { content, sha } = req.body

    // TO-DO:
    // Validate pageName and content

    const IsomerFile = new File(access_token, siteName)
    const pageType = new PageType()
    IsomerFile.setFileType(pageType)
    const { newSha } = await IsomerFile.update(pageName, content, sha)

    res.status(200).json({ pageName, content, sha: newSha })
  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

// Delete page
router.delete('/:siteName/pages/:pageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName } = req.params
    const { sha } = req.body

    const IsomerFile = new File(access_token, siteName)
    const pageType = new PageType()
    IsomerFile.setFileType(pageType)
    await IsomerFile.delete(pageName, sha)

    res.status(200).send('OK')
  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

// Rename page
router.post('/:siteName/pages/:pageName/rename/:newPageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName, newPageName } = req.params
    const { sha, content } = req.body

    // TO-DO:
    // Validate pageName and content

    const IsomerFile = new File(access_token, siteName)
    const pageType = new PageType()
    IsomerFile.setFileType(pageType)
    const { sha: newSha } = await IsomerFile.create(newPageName, content)
    await IsomerFile.delete(pageName, sha)

    res.status(200).json({ pageName: newPageName, content, sha: newSha })

  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

module.exports = router;