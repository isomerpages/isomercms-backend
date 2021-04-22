const express = require('express');
const router = express.Router();

// Import middleware
const { 
  attachReadRouteHandlerWrapper, 
  attachWriteRouteHandlerWrapper, 
} = require('../middleware/routeHandler')

// Import classes 
const { File, ImageType } = require('../classes/File.js')
const { MediaFile } = require('../classes/MediaFile.js');

const extractDirectoryAndFileName = (imageName) => {
  let imageDirectory, imageFileName

  const pathArr = imageName.split('/')
  if (pathArr.length === 1) {
    imageDirectory = 'images'
    imageFileName = imageName
  } else if (pathArr.length > 1) {
    imageDirectory = `images/${pathArr.slice(0, -1)}`
    imageFileName = pathArr[pathArr.length - 1]
  }
  return {
    imageDirectory,
    imageFileName,
  }
}

// List images
async function listImages (req, res, next) {
  const { accessToken } = req
  const { siteName } = req.params

  const IsomerFile = new File(accessToken, siteName)
  const imageType =  new ImageType()
  IsomerFile.setFileType(imageType)
  const images = await IsomerFile.list()
  
  res.status(200).json({ images })
}

// Create new image
async function createNewImage (req, res, next) {
  const { accessToken } = req

  const { siteName } = req.params
  const { imageName, imageDirectory, content } = req.body

  // TO-DO:
  // Validate imageName and content

  const IsomerImageFile = new MediaFile(accessToken, siteName)
  IsomerImageFile.setFileTypeToImage(imageDirectory)
  const { sha } = await IsomerImageFile.create(imageName, content)

  res.status(200).json({ imageName, content, sha })
}

// Read image
async function readImage (req, res, next) {
  const { accessToken } = req

  const { siteName, imageName } = req.params

  // get image directory
  const { imageDirectory, imageFileName } = extractDirectoryAndFileName(imageName)

  const IsomerImageFile = new MediaFile(accessToken, siteName)
  IsomerImageFile.setFileTypeToImage(imageDirectory)

  const { sha, content } = await IsomerImageFile.read(imageFileName)

  // TO-DO:
  // Validate content

  res.status(200).json({ imageName, sha, content })
}

// Update image
async function updateImage (req, res, next) {
  const { accessToken } = req

  const { siteName, imageName } = req.params
  const { content, sha } = req.body

  // TO-DO:
  // Validate imageName and content

  const IsomerFile = new File(accessToken, siteName)
  const imageType =  new ImageType()
  IsomerFile.setFileType(imageType)
  const { newSha } = await IsomerFile.update(imageName, content, sha)

  res.status(200).json({ imageName, content, sha: newSha })
}

// Delete image
async function deleteImage (req, res, next) {
  const { accessToken } = req

  const { siteName, imageName } = req.params
  const { sha } = req.body

  const IsomerFile = new File(accessToken, siteName)
  const imageType =  new ImageType()
  IsomerFile.setFileType(imageType)
  await IsomerFile.delete(imageName, sha)

  res.status(200).send('OK')
}

// Rename image
async function renameImage (req, res, next) {
  const { accessToken } = req

  const { siteName, imageName, newImageName } = req.params
  const { sha, content } = req.body

  // TO-DO:
  // Validate imageName and content

  // Create new file with name ${newImageName}

  const { imageDirectory: oldImageDirectory, imageFileName: oldImageFileName } = extractDirectoryAndFileName(imageName)
  const { imageDirectory: newImageDirectory, imageFileName: newImageFileName } = extractDirectoryAndFileName(newImageName)

  const newIsomerImageFile = new MediaFile(accessToken, siteName)
  newIsomerImageFile.setFileTypeToImage(newImageDirectory)
  const { sha: newSha } = await newIsomerImageFile.create(newImageFileName, content)

  const oldIsomerImageFile = new MediaFile(accessToken, siteName)
  oldIsomerImageFile.setFileTypeToImage(oldImageDirectory)
  await oldIsomerImageFile.delete(oldImageFileName, sha)

  res.status(200).json({ imageName: newImageName, content, sha: newSha })
}
router.get('/:siteName/images', attachReadRouteHandlerWrapper(listImages))
router.post('/:siteName/images', attachWriteRouteHandlerWrapper(createNewImage))
router.get('/:siteName/images/:imageName', attachReadRouteHandlerWrapper(readImage))
router.post('/:siteName/images/:imageName', attachWriteRouteHandlerWrapper(updateImage))
router.delete('/:siteName/images/:imageName', attachWriteRouteHandlerWrapper(deleteImage))
router.post('/:siteName/images/:imageName/rename/:newImageName', attachWriteRouteHandlerWrapper(renameImage))

module.exports = router;