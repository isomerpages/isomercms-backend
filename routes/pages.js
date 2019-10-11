const express = require('express');
const router = express.Router();
const axios = require('axios');
// const base64 = require('base-64');
const jwtUtils = require('../utils/jwt-utils')
const _ = require('lodash')

// Import classes 
const { File, PageType } = require('../classes/File.js')

// List pages
router.get('/:siteName/pages', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const GitHubFile = new File(access_token, siteName)
    const pages = await GitHubFile.setFileType(PageType).list()

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

    const GitHubFile = new File(access_token, siteName)
    await GitHubFile.setFileType(PageType).create(pageName, content)

    res.status(200).json({ pageName, content })

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

    const GitHubFile = new File(access_token, siteName)
    const { sha, content } = await GitHubFile.setFileType(PageType).read(pageName)

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

    const GitHubFile = new File(access_token, siteName)
    await GitHubFile.setFileType(PageType).update(pageName, content, sha)

    res.status(200).json({ pageName, content })
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

    const GitHubFile = new File(access_token, siteName)
    await GitHubFile.setFileType(PageType).delete(pageName, sha)

    res.status(200).json({ pageName })
  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

// Rename page
router.post('/:siteName/pages/:pageName/rename', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, pageName } = req.params
    const { newPageName, sha, content } = req.body

    // TO-DO:
    // Validate pageName and content

    const GitHubFile = new File(access_token, siteName)
    await GitHubFile.setFileType(PageType).create(newPageName, content)
    await GitHubFile.delete(pageName, sha)

    res.status(200).json({ newPageName })

  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

module.exports = router;