const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import classes 
const { File, ImageType } = require('../classes/File.js')
const { ImageFile } = require('../classes/ImageFile.js')

// List images
router.get('/:siteName/images', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)
    const { siteName } = req.params

    const IsomerFile = new File(access_token, siteName)
    const imageType =  new ImageType()
    IsomerFile.setFileType(imageType)
    const images = await IsomerFile.list()
    
    res.status(200).json({ images })
  } catch (err) {
    console.log(err)
  }
})

// Create new image
router.post('/:siteName/images', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName } = req.params
    const { imageName, content } = req.body

    // TO-DO:
    // Validate imageName and content

    const IsomerImageFile = new ImageFile(access_token, siteName)
    IsomerImageFile.setFileTypeToImage()
    await IsomerImageFile.create(imageName, content)

    res.status(200).json({ imageName, content })
  } catch (err) {
    console.log(err)
  }
})

// Read image
router.get('/:siteName/images/:imageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, imageName } = req.params

    const IsomerImageFile = new ImageFile(access_token, siteName)
    IsomerImageFile.setFileTypeToImage()
    const { sha, content } = await IsomerImageFile.read(imageName)

    // TO-DO:
    // Validate content

    res.status(200).json({ imageName, sha, content })
  } catch (err) {
    console.log(err)
  }
})

// Update image
router.post('/:siteName/images/', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName } = req.params
    const { content, imageName } = req.body

    // TO-DO:
    // Validate imageName and content

    const IsomerImageFile = new ImageFile(access_token, siteName)
    IsomerImageFile.setFileTypeToImage()
    await IsomerImageFile.create(imageName, content)

    res.status(200).json({ imageName, content, sha: newSha })
  } catch (err) {
    console.log(err)
  }
})

// Delete image
router.delete('/:siteName/images/:imageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, imageName } = req.params
    const { sha } = req.body

    const IsomerFile = new File(access_token, siteName)
    const imageType =  new ImageType()
    IsomerFile.setFileType(imageType)
    await IsomerFile.delete(imageName, sha)

    res.status(200).send('OK')
  } catch (err) {
    console.log(err)
  }
})

// Rename image
router.post('/:siteName/images/:imageName/rename/:newImageName', async function(req, res, next) {
  try {
    const { oauthtoken } = req.cookies
    const { access_token } = jwtUtils.verifyToken(oauthtoken)

    const { siteName, imageName, newImageName } = req.params
    const { sha, content } = req.body

    // TO-DO:
    // Validate imageName and content

    // Create new file with name ${newImageName}

    const IsomerFile = new File(access_token, siteName)
    const imageType =  new ImageType()
    IsomerFile.setFileType(imageType)
    const { sha: newSha } = await IsomerFile.create(newImageName, content)
    await IsomerFile.delete(imageName, sha)

    res.status(200).json({ imageName: newImageName, content, sha: newSha })
  } catch (err) {
    console.log(err)
  }
})

module.exports = router;