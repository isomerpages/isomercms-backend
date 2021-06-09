const Bluebird = require("bluebird")
const express = require("express")
const _ = require("lodash")
const yaml = require("yaml")

// Import errors
const { NotFoundError } = require("@errors/NotFoundError")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const { Collection } = require("@classes/Collection")
const { CollectionConfig } = require("@classes/Config")
const { File, CollectionPageType } = require("@classes/File")

// Import utils
const { readCollectionPageUtilFunc } = require("@utils/route-utils")

const FolderPageService = require('../fileServices/MdPageServices/FolderPageService')
const FolderYmlService = require('../fileServices/YmlFileServices/FolderYmlService')


const router = express.Router()

// List pages in collection
async function listCollectionPages(req, res) {
  const { accessToken } = req
  const { siteName, collectionName } = req.params

  // TO-DO: Verify that collection exists

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  const collectionPages = await IsomerFile.list()

  return res.status(200).json({ collectionPages })
}

// Get details on all pages in a collection
async function listCollectionPagesDetails(req, res) {
  const { accessToken } = req
  const { siteName, collectionName } = req.params

  // Verify that collection exists
  const IsomerCollection = new Collection(accessToken, siteName)
  const collections = await IsomerCollection.list()
  if (!collections.includes(collectionName))
    throw new NotFoundError("Collection provided was not a valid collection")

  // Retrieve metadata of files in collection
  const CollectionPage = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  CollectionPage.setFileType(collectionPageType)
  const collectionPages = await CollectionPage.list()
  const collectionPagesMetadata = await Bluebird.map(
    collectionPages,
    async (page) => {
      const { content } = await readCollectionPageUtilFunc(
        accessToken,
        siteName,
        collectionName,
        page.fileName
      )
      const frontMatter = yaml.parse(Base64.decode(content).split("---")[1])
      return {
        fileName: page.fileName,
        title: frontMatter.title,
        thirdNavTitle: frontMatter.third_nav_title,
      }
    }
  )

  const collectionHierarchy = collectionPagesMetadata.reduce((acc, file) => {
    if (file.thirdNavTitle) {
      // Check whether third nav section already exists
      const thirdNavIteratee = { type: "third-nav", title: file.thirdNavTitle }
      if (_.some(acc, thirdNavIteratee)) {
        const thirdNavIdx = _.findIndex(acc, thirdNavIteratee)
        acc[thirdNavIdx].contents.push({
          type: "third-nav-page",
          title: file.title,
          fileName: file.fileName,
        })
        return acc
      }

      // Create new third nav section
      acc.push({
        type: "third-nav",
        title: file.thirdNavTitle,
        contents: [
          {
            type: "third-nav-page",
            title: file.title,
            fileName: file.fileName,
          },
        ],
      })
      return acc
    }

    // If no third nav title, just push into array
    acc.push({
      type: "page",
      title: file.title,
      fileName: file.fileName,
    })
    return acc
  }, [])

  return res.status(200).json({ collectionPages: collectionHierarchy })
}

// // Create new page in collection
async function createCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, collectionName, pageName: encodedPageName } = req.params
  const { content: pageContent } = req.body
  const pageName = decodeURIComponent(encodedPageName)

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  await IsomerFile.create(pageName, Base64.encode(pageContent))

  const config = new CollectionConfig(accessToken, siteName, collectionName)
  await config.addItemToOrder(pageName)

  return res.status(200).json({ collectionName, pageName, pageContent })
}

// assumes that our files are either md or yml
const isMdFile = (pageName) => pageName.split('.')[1] === 'md'

// Read page in collection
async function readCollectionPage(req, res) {
  const { accessToken } = req
  const { siteName, pageName, collectionName } = req.params // no need for decoding - express does it automatically

  const reqDetails = { accessToken, siteName }
  const opts = { pageName, collectionName }

  console.log(' ')
  console.log(' HI HI')
  
  const isMd = isMdFile(pageName)

  const { sha, content} = isMd ? await FolderPageService.Read(opts, reqDetails) : await FolderYmlService.Read(opts, reqDetails)

  // TO-DO:
  // Validate content

  return res.status(200).json({ collectionName, pageName, sha, content })
}

// Update page in collection
async function updateCollectionPage(req, res) {
  const { accessToken } = req
  const { siteName, pageName, collectionName } = req.params // no need for decoding - express does it automatically
    
  const { content: pageContent, sha } = req.body

  // TO-DO:
  // Validate pageName and content

  const reqDetails = { accessToken, siteName }
  const opts = { pageName, collectionName, fileContent: pageContent, sha }

  const { newSha } = await FolderPageService.Update(opts, reqDetails)

  return res
    .status(200)
    .json({ collectionName, pageName, pageContent, sha: newSha })
}

// Delete page in collection
async function deleteCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const { sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)
  // TO-DO:
  // Validate that collection exists

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  await IsomerFile.delete(pageName, sha)

  const collectionConfig = new CollectionConfig(
    accessToken,
    siteName,
    collectionName
  )
  await collectionConfig.deleteItemFromOrder(pageName)

  return res.status(200).send("OK")
}

// Rename page in collection
async function renameCollectionPage(req, res) {
  const { accessToken } = req

  const {
    siteName,
    pageName: encodedPageName,
    collectionName,
    newPageName: encodedNewPageName,
  } = req.params
  const { sha, content: pageContent } = req.body

  const pageName = decodeURIComponent(encodedPageName)
  const newPageName = decodeURIComponent(encodedNewPageName)

  const collectionConfig = new CollectionConfig(
    accessToken,
    siteName,
    collectionName
  )
  // TO-DO:
  // Validate that collection exists
  // Validate pageName and content

  // Create new collection page with name ${newPageName}

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  const { sha: newSha } = await IsomerFile.create(
    newPageName,
    Base64.encode(pageContent)
  )
  await IsomerFile.delete(pageName, sha)
  await collectionConfig.updateItemInOrder(pageName, newPageName)

  return res
    .status(200)
    .json({ collectionName, pageName: newPageName, pageContent, sha: newSha })
}

router.get(
  "/:siteName/collections/:collectionName",
  attachReadRouteHandlerWrapper(listCollectionPages)
)
router.get(
  "/:siteName/collections/:collectionName/pages",
  attachReadRouteHandlerWrapper(listCollectionPagesDetails)
)
router.post(
  "/:siteName/collections/:collectionName/pages/new/:pageName",
  attachRollbackRouteHandlerWrapper(createCollectionPage)
)
router.get(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachReadRouteHandlerWrapper(readCollectionPage)
)
router.post(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachWriteRouteHandlerWrapper(updateCollectionPage)
)
router.delete(
  "/:siteName/collections/:collectionName/pages/:pageName",
  attachRollbackRouteHandlerWrapper(deleteCollectionPage)
)
router.post(
  "/:siteName/collections/:collectionName/pages/:pageName/rename/:newPageName",
  attachRollbackRouteHandlerWrapper(renameCollectionPage)
)

module.exports = router
