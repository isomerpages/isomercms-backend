import { Versions } from "@constants"

const express = require("express")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const { Collection } = require("@classes/Collection")
const { CollectionConfig } = require("@classes/Config")
const { File, PageType, CollectionPageType } = require("@classes/File")
const { Subfolder } = require("@classes/Subfolder")

const { deslugifyCollectionName } = require("@utils/utils")
const {
  sanitizedYamlParse,
  sanitizedYamlStringify,
} = require("@utils/yaml-utils")

const { statsMiddleware } = require("@root/middleware/stats")

const router = express.Router({ mergeParams: true })

async function listPages(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { siteName } = req.params
  const { accessToken } = userWithSiteSessionData

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  const simplePages = await IsomerFile.list()

  return res.status(200).json({ pages: simplePages })
}

async function createPage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, pageName: encodedPageName } = req.params
  const { content: pageContent } = req.body
  const pageName = decodeURIComponent(encodedPageName)

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  await IsomerFile.create(pageName, Base64.encode(pageContent))

  return res.status(200).json({ pageName, pageContent })
}

// Read page
async function readPage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, pageName: encodedPageName } = req.params
  const pageName = decodeURIComponent(encodedPageName)

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  const { sha, content: encodedContent } = await IsomerFile.read(pageName)

  const content = Base64.decode(encodedContent)

  // TO-DO:
  // Validate content

  return res.status(200).json({ pageName, sha, content })
}

// Update page
async function updatePage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, pageName: encodedPageName } = req.params
  const { content: pageContent, sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)

  // TO-DO:
  // Validate pageName and content

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  const { newSha } = await IsomerFile.update(
    pageName,
    Base64.encode(pageContent),
    sha
  )

  return res.status(200).json({ pageName, pageContent, sha: newSha })
}

// Delete page
async function deletePage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const { siteName, pageName: encodedPageName } = req.params
  const { sha } = req.body
  const pageName = decodeURIComponent(encodedPageName)

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  await IsomerFile.delete(pageName, sha)

  return res.status(200).send("OK")
}

// Rename page
async function renamePage(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData

  const {
    siteName,
    pageName: encodedPageName,
    newPageName: encodedNewPageName,
  } = req.params
  const { sha, content: pageContent } = req.body

  // TO-DO:
  // Validate pageName and content
  const pageName = decodeURIComponent(encodedPageName)
  const newPageName = decodeURIComponent(encodedNewPageName)

  const IsomerFile = new File(accessToken, siteName)
  const pageType = new PageType()
  IsomerFile.setFileType(pageType)
  const { sha: newSha } = await IsomerFile.create(
    newPageName,
    Base64.encode(pageContent)
  )
  await IsomerFile.delete(pageName, sha)

  return res
    .status(200)
    .json({ pageName: newPageName, pageContent, sha: newSha })
}

// Move unlinked pages
async function moveUnlinkedPages(req, res) {
  const { userWithSiteSessionData } = res.locals
  const { accessToken } = userWithSiteSessionData
  const { siteName, newPagePath } = req.params
  const { files } = req.body
  const processedTargetPathTokens = decodeURIComponent(newPagePath).split("/")
  const targetCollectionName = processedTargetPathTokens[0]
  const targetSubfolderName = processedTargetPathTokens[1]

  const IsomerCollection = new Collection(accessToken, siteName)
  const collections = await IsomerCollection.list()

  // Check if collection already exists
  if (!collections.includes(targetCollectionName)) {
    await IsomerCollection.create(targetCollectionName)
  }

  const oldIsomerFile = new File(accessToken, siteName)
  const newIsomerFile = new File(accessToken, siteName)
  const oldPageType = new PageType()
  const newCollectionPageType = new CollectionPageType(
    decodeURIComponent(newPagePath)
  )
  oldIsomerFile.setFileType(oldPageType)
  newIsomerFile.setFileType(newCollectionPageType)
  const newConfig = new CollectionConfig(
    accessToken,
    siteName,
    targetCollectionName
  )

  if (newConfig && targetSubfolderName) {
    // Check if subfolder exists
    const IsomerSubfolder = new Subfolder(
      accessToken,
      siteName,
      targetCollectionName
    )
    const subfolders = await IsomerSubfolder.list()
    if (!subfolders.includes(targetSubfolderName))
      await IsomerSubfolder.create(targetSubfolderName)
  }

  // To fix after refactoring
  /* eslint-disable no-await-in-loop, no-restricted-syntax */
  // We can't perform these operations concurrently because of conflict issues
  for (const fileName of files) {
    const { content, sha } = await oldIsomerFile.read(fileName)
    await oldIsomerFile.delete(fileName, sha)
    if (targetSubfolderName) {
      // Adding third nav to front matter, to be removed after template rewrite

      // eslint-disable-next-line no-unused-vars
      const [unused, encodedFrontMatter, pageContent] = Base64.decode(
        content
      ).split("---")
      const frontMatter = sanitizedYamlParse(encodedFrontMatter)
      frontMatter.third_nav_title = deslugifyCollectionName(targetSubfolderName)
      const newFrontMatter = sanitizedYamlStringify(frontMatter)
      const newContent = ["---\n", newFrontMatter, "---", pageContent].join("")
      const newEncodedContent = Base64.encode(newContent)
      await newIsomerFile.create(fileName, newEncodedContent)
    } else {
      await newIsomerFile.create(fileName, content)
    }
    // Update collection.yml files
    await newConfig.addItemToOrder(
      `${targetSubfolderName ? `${targetSubfolderName}/` : ""}${fileName}`
    )
  }

  return res.status(200).send("OK")
}

router.get(
  "/",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "listPages"),
  attachReadRouteHandlerWrapper(listPages)
)
router.post(
  "/new/:pageName",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "createPage"),
  attachWriteRouteHandlerWrapper(createPage)
)
router.get(
  "/:pageName",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "readPage"),
  attachReadRouteHandlerWrapper(readPage)
)
router.post(
  "/:pageName",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "updatePage"),
  attachWriteRouteHandlerWrapper(updatePage)
)
router.delete(
  "/:pageName",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "deletePage"),
  attachWriteRouteHandlerWrapper(deletePage)
)
router.post(
  "/:pageName/rename/:newPageName",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "renamePage"),
  attachRollbackRouteHandlerWrapper(renamePage)
)
router.post(
  "/move/:newPagePath",
  statsMiddleware.logVersionNumberCallFor(Versions.V1, "moveUnlinkedPages"),
  attachRollbackRouteHandlerWrapper(moveUnlinkedPages)
)

module.exports = router
