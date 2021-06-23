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
const { File, CollectionPageType } = require("@classes/File")

const { readCollectionPageUtilFunc } = require("@utils/route-utils")

const CollectionPageService = require("@services/fileServices/MdPageServices/CollectionPageService")
const ThirdNavPageService = require("@services/fileServices/MdPageServices/ThirdNavPageService")

// Import utils

const router = express.Router()

// Get details on all pages in a collection
async function listCollectionPagesDetails(req, res) {
  // TODO: move into collection service
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

  if (pageName.includes("/")) {
    const [thirdNavTitle, parsedPageName] = pageName.split("/")
    await ThirdNavPageService.Create(
      { siteName, accessToken },
      {
        fileName: parsedPageName,
        collectionName,
        content: pageContent,
        thirdNavTitle,
      }
    )

    return res.status(200).json({ collectionName, pageName, pageContent })
  }
  await CollectionPageService.Create(
    { siteName, accessToken },
    { fileName: pageName, collectionName, content: pageContent }
  )

  return res.status(200).json({ collectionName, pageName, pageContent })
}

// Read page in collection
async function readCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const pageName = decodeURIComponent(encodedPageName)

  // TODO: split into separate endpoint for third nav page
  if (pageName.includes("/")) {
    const [thirdNavTitle, parsedPageName] = pageName.split("/")
    const { sha, content } = await ThirdNavPageService.Read(
      { siteName, accessToken },
      { fileName: parsedPageName, collectionName, thirdNavTitle }
    )

    return res.status(200).json({ collectionName, pageName, sha, content })
  }
  const { sha, content } = await CollectionPageService.Read(
    { siteName, accessToken },
    { fileName: pageName, collectionName }
  )

  return res.status(200).json({ collectionName, pageName, sha, content })
}

// Update page in collection
async function updateCollectionPage(req, res) {
  const { accessToken } = req

  const { siteName, pageName: encodedPageName, collectionName } = req.params
  const { content: pageContent, sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)

  // TODO: split into separate endpoint for third nav page
  if (pageName.includes("/")) {
    const [thirdNavTitle, parsedPageName] = pageName.split("/")
    const { newSha } = await ThirdNavPageService.Update(
      { siteName, accessToken },
      {
        fileName: parsedPageName,
        collectionName,
        content: pageContent,
        thirdNavTitle,
        sha,
      }
    )

    return res
      .status(200)
      .json({ collectionName, pageName, pageContent, sha: newSha })
  }
  const { newSha } = await CollectionPageService.Update(
    { siteName, accessToken },
    { fileName: pageName, collectionName, content: pageContent, sha }
  )
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

  // TODO: split into separate endpoint for third nav page
  if (pageName.includes("/")) {
    const [thirdNavTitle, parsedPageName] = pageName.split("/")
    await ThirdNavPageService.Delete(
      { siteName, accessToken },
      { fileName: parsedPageName, collectionName, thirdNavTitle, sha }
    )

    return res.status(200).send("OK")
  }
  await CollectionPageService.Delete(
    { siteName, accessToken },
    { fileName: pageName, collectionName, sha }
  )

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
  const { content: pageContent } = req.body

  const pageName = decodeURIComponent(encodedPageName)
  const newPageName = decodeURIComponent(encodedNewPageName)

  // TODO: split into separate endpoint for third nav page
  if (pageName.includes("/")) {
    const [thirdNavTitle, parsedOldPageName] = pageName.split("/")
    const [unused, parsedNewPageName] = newPageName.split("/")
    const { newSha } = await ThirdNavPageService.Rename(
      { siteName, accessToken },
      {
        oldFileName: parsedOldPageName,
        newFileName: parsedNewPageName,
        thirdNavTitle,
        collectionName,
      }
    )

    return res
      .status(200)
      .json({ collectionName, pageName: newPageName, pageContent, sha: newSha })
  }
  const { newSha } = await CollectionPageService.Rename(
    { siteName, accessToken },
    { oldFileName: pageName, newFileName: newPageName, collectionName }
  )

  return res
    .status(200)
    .json({ collectionName, pageName: newPageName, pageContent, sha: newSha })
}

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
