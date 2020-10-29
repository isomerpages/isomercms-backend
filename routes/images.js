const express = require('express');
const router = express.Router();
const jwtUtils = require('../utils/jwt-utils')

// Import middleware
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

// Import classes 
const { File, ImageType } = require('../classes/File.js')
const { ImageFile } = require('../classes/ImageFile.js');
const { update } = require('lodash');

// List images
async function listImages (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)
  const { siteName } = req.params

  const IsomerFile = new File(access_token, siteName)
  const imageType =  new ImageType()
  IsomerFile.setFileType(imageType)
  const images = await IsomerFile.list()
  
  res.status(200).json({ images })
}

// Create new image
async function createNewImage (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)

  const { siteName } = req.params
  const { imageName, content } = req.body

  // TO-DO:
  // Validate imageName and content

  const IsomerFile = new File(access_token, siteName)
  const imageType =  new ImageType()
  IsomerFile.setFileType(imageType)
  const { sha } = await IsomerFile.create(imageName, content)

  res.status(200).json({ imageName, content, sha })
}

// Read image
async function readImage (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)

  const { siteName, imageName } = req.params

  const IsomerImageFile = new ImageFile(access_token, siteName)
  IsomerImageFile.setFileTypeToImage()
  const { sha, content } = await IsomerImageFile.read(imageName)

  // TO-DO:
  // Validate content

  res.status(200).json({ imageName, sha, content })
}

// Update image
async function updateImage (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)

  const { siteName, imageName } = req.params
  const { content, sha } = req.body

  // TO-DO:
  // Validate imageName and content

  const IsomerFile = new File(access_token, siteName)
  const imageType =  new ImageType()
  IsomerFile.setFileType(imageType)
  const { newSha } = await IsomerFile.update(imageName, content, sha)

  res.status(200).json({ imageName, content, sha: newSha })
}

// Delete image
async function deleteImage (req, res, next) {
  const { oauthtoken } = req.cookies
  const { access_token } = jwtUtils.verifyToken(oauthtoken)

  const { siteName, imageName } = req.params
  const { sha } = req.body

  const IsomerFile = new File(access_token, siteName)
  const imageType =  new ImageType()
  IsomerFile.setFileType(imageType)
  await IsomerFile.delete(imageName, sha)

  res.status(200).send('OK')
}

// Rename image
async function renameImage (req, res, next) {
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
}
router.get('/:siteName/images', attachRouteHandlerWrapper(listImages))
router.post('/:siteName/images', attachRouteHandlerWrapper(createNewImage))
router.get('/:siteName/images/:imageName', attachRouteHandlerWrapper(readImage))
router.post('/:siteName/images/:imageName', attachRouteHandlerWrapper(updateImage))
router.delete('/:siteName/images/:imageName', attachRouteHandlerWrapper(deleteImage))
router.post('/:siteName/images/:imageName/rename/:newImageName', attachRouteHandlerWrapper(renameImage))

module.exports = router;