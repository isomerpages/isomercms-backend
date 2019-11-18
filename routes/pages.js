const express = require('express')
const router = express.Router()
const jwtUtils = require('../utils/jwt-utils')

// Import classes
const { File, PageType } = require('../classes/File.js')

// List pages
router.get('/:siteName/pages', async function (req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const IsomerFile = new File(access_token, siteName)
    const pageType = new PageType()
    IsomerFile.setFileType(pageType)
    const pages = await IsomerFile.list()

    res.status(200).json({ pages })
  } catch (err) {
    console.log(err)
    res.status(400).json(err)
  }
})

// Create new page
router.post('/:siteName/pages', async function (req, res, next) {
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
router.get('/:siteName/pages/:pageName', async function (req, res, next) {
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
router.post('/:siteName/pages/:pageName', async function (req, res, next) {
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
router.delete('/:siteName/pages/:pageName', async function (req, res, next) {
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
router.post('/:siteName/pages/:pageName/rename/:newPageName', async function (req, res, next) {
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

module.exports = router
