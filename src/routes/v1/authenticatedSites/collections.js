const express = require("express")
const yaml = require("yaml")

// Import middleware
const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const { Collection } = require("@classes/Collection")
const { CollectionConfig } = require("@classes/Config")
const { File, CollectionPageType, PageType } = require("@classes/File")
const { Subfolder } = require("@classes/Subfolder")

const { deslugifyCollectionName } = require("@utils/utils")

const router = express.Router({ mergeParams: true })

// List collections
async function listCollections(req, res) {
  const { sessionData } = res.locals
  const { siteName } = req.params
  const accessToken = sessionData.getAccessToken()

  const IsomerCollection = new Collection(accessToken, siteName)
  const collections = await IsomerCollection.list()

  return res.status(200).json({ collections })
}

// Create new collection
async function createNewCollection(req, res) {
  const { sessionData } = res.locals
  const { siteName } = req.params
  const { collectionName } = req.body
  const accessToken = sessionData.getAccessToken()

  const IsomerCollection = new Collection(accessToken, siteName)
  await IsomerCollection.create(collectionName)

  return res.status(200).json({ collectionName })
}

// Delete collection
async function deleteCollection(req, res) {
  // TO-DO: Verify that collection exists

  // Remove collection from config file
  const { sessionData } = res.locals
  const { siteName, collectionName } = req.params
  const accessToken = sessionData.getAccessToken()
  const { currentCommitSha, treeSha } = sessionData.getGithubState()

  const IsomerCollection = new Collection(accessToken, siteName)
  await IsomerCollection.delete(collectionName, currentCommitSha, treeSha)

  return res.status(200).json({ collectionName })
}

// Rename collection
async function renameCollection(req, res) {
  // TO-DO: Verify that collection exists

  // Remove collection from config file
  const { sessionData } = res.locals
  const { siteName, collectionName, newCollectionName } = req.params
  const accessToken = sessionData.getAccessToken()
  const { currentCommitSha, treeSha } = sessionData.getGithubState()

  const IsomerCollection = new Collection(accessToken, siteName)
  await IsomerCollection.rename(
    collectionName,
    newCollectionName,
    currentCommitSha,
    treeSha
  )

  return res.status(200).json({ collectionName, newCollectionName })
}

// Move files in collection
async function moveFiles(req, res) {
  const { sessionData } = res.locals
  const accessToken = sessionData.getAccessToken()
  const { siteName, collectionPath, targetPath } = req.params
  const { files } = req.body
  const processedCollectionPathTokens = decodeURIComponent(
    collectionPath
  ).split("/")
  const collectionName = processedCollectionPathTokens[0]
  const collectionSubfolderName = processedCollectionPathTokens[1]
  const processedTargetPathTokens = decodeURIComponent(targetPath).split("/")
  const targetCollectionName = processedTargetPathTokens[0]
  const targetSubfolderName = processedTargetPathTokens[1]

  const IsomerCollection = new Collection(accessToken, siteName)
  const collections = await IsomerCollection.list()

  // Check if collection already exists
  if (
    !collections.includes(targetCollectionName) &&
    targetCollectionName !== "pages"
  ) {
    await IsomerCollection.create(targetCollectionName)
  }

  const oldIsomerFile = new File(accessToken, siteName)
  const newIsomerFile = new File(accessToken, siteName)
  const oldCollectionPageType = new CollectionPageType(
    decodeURIComponent(collectionPath)
  )
  const newCollectionPageType =
    targetCollectionName === "pages"
      ? new PageType()
      : new CollectionPageType(decodeURIComponent(targetPath))
  oldIsomerFile.setFileType(oldCollectionPageType)
  newIsomerFile.setFileType(newCollectionPageType)
  const oldConfig = new CollectionConfig(accessToken, siteName, collectionName)
  const newConfig =
    targetCollectionName === "pages"
      ? null
      : new CollectionConfig(accessToken, siteName, targetCollectionName)

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

  // We can't perform these operations concurrently because of conflict issues

  // To fix after refactoring
  /* eslint-disable no-await-in-loop, no-restricted-syntax */
  for (const fileName of files) {
    const { content, sha } = await oldIsomerFile.read(fileName)
    await oldIsomerFile.delete(fileName, sha)
    if (targetSubfolderName || collectionSubfolderName) {
      // Modifying third nav in front matter, to be removed after template rewrite

      // eslint-disable-next-line no-unused-vars
      const [unused, encodedFrontMatter, pageContent] = Base64.decode(
        content
      ).split("---")
      const frontMatter = yaml.parse(encodedFrontMatter)
      if (targetSubfolderName)
        frontMatter.third_nav_title = deslugifyCollectionName(
          targetSubfolderName
        )
      else delete frontMatter.third_nav_title
      const newFrontMatter = yaml.stringify(frontMatter)
      const newContent = ["---\n", newFrontMatter, "---", pageContent].join("")
      const newEncodedContent = Base64.encode(newContent)
      await newIsomerFile.create(fileName, newEncodedContent)
    } else {
      await newIsomerFile.create(fileName, content)
    }

    // Update collection.yml files
    await oldConfig.deleteItemFromOrder(
      `${
        collectionSubfolderName ? `${collectionSubfolderName}/` : ""
      }${fileName}`
    )
    if (newConfig)
      await newConfig.addItemToOrder(
        `${targetSubfolderName ? `${targetSubfolderName}/` : ""}${fileName}`
      )
  }

  return res.status(200).send("OK")
}

router.get("/", attachReadRouteHandlerWrapper(listCollections))
router.post("/", attachRollbackRouteHandlerWrapper(createNewCollection))
router.delete(
  "/:collectionName",
  attachRollbackRouteHandlerWrapper(deleteCollection)
)
router.post(
  "/:collectionName/rename/:newCollectionName",
  attachRollbackRouteHandlerWrapper(renameCollection)
)
router.post(
  "/:collectionPath/move/:targetPath",
  attachRollbackRouteHandlerWrapper(moveFiles)
)

module.exports = router
