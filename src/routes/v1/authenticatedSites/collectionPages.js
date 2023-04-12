import { statsMiddleware } from "@root/middleware/stats"

const Bluebird = require("bluebird")
const express = require("express")
const _ = require("lodash")

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
const { sanitizedYamlParse } = require("@utils/yaml-utils")

const router = express.Router({ mergeParams: true })

// List pages in collection
async function listCollectionPages(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName, collectionName } = req.params
  const { accessToken } = userWithSiteSessionData

  // TO-DO: Verify that collection exists

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  const collectionPages = await IsomerFile.list()

  return res.status(200).json({ collectionPages })
}

// Get details on all pages in a collection
async function listCollectionPagesDetails(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName, collectionName } = req.params
  const { accessToken } = userWithSiteSessionData

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
      const frontMatter = sanitizedYamlParse(
        Base64.decode(content).split("---")[1]
      )
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
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

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

// Read page in collection
async function readCollectionPage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const pageName = decodeURIComponent(encodedPageName)

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  const { sha, content: encodedContent } = await IsomerFile.read(pageName)
  const content = Base64.decode(encodedContent)

  // TO-DO:
  // Validate content

  return res.status(200).json({ collectionName, pageName, sha, content })
}

// Update page in collection
async function updateCollectionPage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const { content: pageContent, sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)

  // TO-DO:
  // Validate pageName and content

  const IsomerFile = new File(accessToken, siteName)
  const collectionPageType = new CollectionPageType(collectionName)
  IsomerFile.setFileType(collectionPageType)
  const { newSha } = await IsomerFile.update(
    pageName,
    Base64.encode(pageContent),
    sha
  )

  return res
    .status(200)
    .json({ collectionName, pageName, pageContent, sha: newSha })
}

// Delete page in collection
async function deleteCollectionPage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

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
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

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
  "/",
  statsMiddleware.logVersionNumberCallFor(1, "listCollectionPages"),
  attachReadRouteHandlerWrapper(listCollectionPages)
)
router.get(
  "/pages",
  statsMiddleware.logVersionNumberCallFor(1, "listCollectionPagesDetails"),
  attachReadRouteHandlerWrapper(listCollectionPagesDetails)
)
router.post(
  "/pages/new/:pageName",
  statsMiddleware.logVersionNumberCallFor(1, "createCollectionPage"),
  attachRollbackRouteHandlerWrapper(createCollectionPage)
)
router.get(
  "/pages/:pageName",
  statsMiddleware.logVersionNumberCallFor(1, "readCollectionPage"),
  attachReadRouteHandlerWrapper(readCollectionPage)
)
router.post(
  "/pages/:pageName",
  statsMiddleware.logVersionNumberCallFor(1, "updateCollectionPage"),
  attachWriteRouteHandlerWrapper(updateCollectionPage)
)
router.delete(
  "/pages/:pageName",
  statsMiddleware.logVersionNumberCallFor(1, "deleteCollectionPage"),
  attachRollbackRouteHandlerWrapper(deleteCollectionPage)
)
router.post(
  "/pages/:pageName/rename/:newPageName",
  statsMiddleware.logVersionNumberCallFor(1, "renameCollectionPage"),
  attachRollbackRouteHandlerWrapper(renameCollectionPage)
)

module.exports = router
