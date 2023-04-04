import { statsMiddleware } from "@root/middleware/stats"

const express = require("express")

const router = express.Router({ mergeParams: true })

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const { File, ImageType } = require("@classes/File")
const { MediaFile } = require("@classes/MediaFile")

const extractDirectoryAndFileName = (imageName) => {
  let imageDirectory
  let imageFileName

  // imageName contains the file path excluding the media folder, e.g. subfolder1/subfolder2/image.png
  const pathArr = imageName.split("/")
  if (pathArr.length === 1) {
    // imageName only contains the file name
    imageDirectory = "images"
    imageFileName = imageName
  } else if (pathArr.length > 1) {
    // We discard the name of the image for the directory
    imageDirectory = `images/${pathArr.slice(0, -1).join("/")}`
    imageFileName = pathArr[pathArr.length - 1]
  }
  return {
    imageDirectory,
    imageFileName,
  }
}

// List images
async function listImages(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName } = req.params
  const { accessToken } = userWithSiteSessionData

  const IsomerFile = new File(accessToken, siteName)
  const imageType = new ImageType()
  IsomerFile.setFileType(imageType)
  const images = await IsomerFile.list()

  return res.status(200).json({ images })
}

// Create new image
async function createNewImage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName } = req.params
  const { imageName, imageDirectory, content } = req.body

  // TO-DO:
  // Validate imageName and content

  const IsomerImageFile = new MediaFile(accessToken, siteName)
  IsomerImageFile.setFileTypeToImage(imageDirectory)
  const { sha } = await IsomerImageFile.create(imageName, content)

  return res.status(200).json({ imageName, content, sha })
}

// Read image
async function readImage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, imageName } = req.params

  // get image directory
  const { imageDirectory, imageFileName } = extractDirectoryAndFileName(
    imageName
  )

  const IsomerImageFile = new MediaFile(accessToken, siteName)
  IsomerImageFile.setFileTypeToImage(imageDirectory)

  const { sha, content } = await IsomerImageFile.read(imageFileName)

  // TO-DO:
  // Validate content

  return res.status(200).json({ imageName, sha, content })
}

// Update image
async function updateImage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, imageName } = req.params
  const { content, sha } = req.body

  // TO-DO:
  // Validate imageName and content

  const IsomerFile = new File(accessToken, siteName)
  const imageType = new ImageType()
  IsomerFile.setFileType(imageType)
  const { newSha } = await IsomerFile.update(imageName, content, sha)

  return res.status(200).json({ imageName, content, sha: newSha })
}

// Delete image
async function deleteImage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, imageName } = req.params
  const { sha } = req.body

  const IsomerFile = new File(accessToken, siteName)
  const imageType = new ImageType()
  IsomerFile.setFileType(imageType)
  await IsomerFile.delete(imageName, sha)

  return res.status(200).send("OK")
}

// Rename image
async function renameImage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, imageName, newImageName } = req.params

  // Create new file with name ${newImageName}

  const {
    imageDirectory: oldImageDirectory,
    imageFileName: oldImageFileName,
  } = extractDirectoryAndFileName(imageName)
  const {
    imageDirectory: newImageDirectory,
    imageFileName: newImageFileName,
  } = extractDirectoryAndFileName(newImageName)

  const oldIsomerImageFile = new MediaFile(accessToken, siteName)
  oldIsomerImageFile.setFileTypeToImage(oldImageDirectory)
  const { sha, content } = await oldIsomerImageFile.read(oldImageFileName)
  await oldIsomerImageFile.delete(oldImageFileName, sha)

  const newIsomerImageFile = new MediaFile(accessToken, siteName)
  newIsomerImageFile.setFileTypeToImage(newImageDirectory)
  await newIsomerImageFile.create(newImageFileName, content)

  return res.status(200).send("OK")
}

// Move image
async function moveImage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, imageName, newImageName } = req.params

  const {
    imageDirectory: oldImageDirectory,
    imageFileName: oldImageFileName,
  } = extractDirectoryAndFileName(imageName)
  const {
    imageDirectory: newImageDirectory,
    imageFileName: newImageFileName,
  } = extractDirectoryAndFileName(newImageName)

  const oldIsomerImageFile = new MediaFile(accessToken, siteName)
  oldIsomerImageFile.setFileTypeToImage(oldImageDirectory)
  const { sha, content } = await oldIsomerImageFile.read(oldImageFileName)
  await oldIsomerImageFile.delete(oldImageFileName, sha)

  const newIsomerImageFile = new MediaFile(accessToken, siteName)
  newIsomerImageFile.setFileTypeToImage(newImageDirectory)
  await newIsomerImageFile.create(newImageFileName, content)

  return res.status(200).send("OK")
}

router.get(
  "/",
  statsMiddleware.logV1CallFor("listImages"),
  attachReadRouteHandlerWrapper(listImages)
)
router.post(
  "/",
  statsMiddleware.logV1CallFor("createNewImage"),
  attachWriteRouteHandlerWrapper(createNewImage)
)
router.get(
  "/:imageName",
  statsMiddleware.logV1CallFor("readImage"),
  attachReadRouteHandlerWrapper(readImage)
)
router.post(
  "/:imageName",
  statsMiddleware.logV1CallFor("updateImage"),
  attachWriteRouteHandlerWrapper(updateImage)
)
router.delete(
  "/:imageName",
  statsMiddleware.logV1CallFor("deleteImage"),
  attachWriteRouteHandlerWrapper(deleteImage)
)
router.post(
  "/:imageName/rename/:newImageName",
  statsMiddleware.logV1CallFor("renameImage"),
  attachRollbackRouteHandlerWrapper(renameImage)
)
router.post(
  "/:imageName/move/:newImageName",
  statsMiddleware.logV1CallFor("moveImage"),
  attachRollbackRouteHandlerWrapper(moveImage)
)

module.exports = router
