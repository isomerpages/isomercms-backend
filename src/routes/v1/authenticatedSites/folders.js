const Bluebird = require("bluebird")
const express = require("express")
const yaml = require("yaml")

const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

// Import classes
const { Collection } = require("@classes/Collection")
const { CollectionConfig } = require("@classes/Config")
const { File, CollectionPageType } = require("@classes/File")

const { getTree, sendTree, deslugifyCollectionName } = require("@utils/utils")

const router = express.Router({ mergeParams: true })

// List pages and directories from all folders
async function listAllFolderContent(req, res) {
  const { accessToken } = res.locals
  const { siteName } = req.params

  const IsomerCollection = new Collection(accessToken, siteName)
  const allFolders = IsomerCollection.list()

  const allFolderContent = []

  await Bluebird.map(allFolders, async (collectionName) => {
    const config = new CollectionConfig(accessToken, siteName, collectionName)
    const { sha, content } = await config.read()
    allFolderContent.push({ name: collectionName, sha, content })
  })

  return res.status(200).json({ allFolderContent })
}

// Delete subfolder
async function deleteSubfolder(req, res) {
  const { accessToken, currentCommitSha, treeSha } = res.locals
  const { siteName, folderName, subfolderName } = req.params

  // Delete subfolder
  const commitMessage = `Delete subfolder ${folderName}/${subfolderName}`
  const isRecursive = true
  const gitTree = await getTree(siteName, accessToken, treeSha, isRecursive)
  const newGitTree = gitTree
    .filter(
      (item) =>
        item.type !== "tree" &&
        item.path.startsWith(`_${folderName}/${subfolderName}/`)
    )
    .map((item) => ({
      ...item,
      sha: null,
    }))
  await sendTree(
    newGitTree,
    treeSha,
    currentCommitSha,
    siteName,
    accessToken,
    commitMessage
  )

  // Update collection config
  const collectionConfig = new CollectionConfig(
    accessToken,
    siteName,
    folderName
  )
  await collectionConfig.deleteSubfolderFromOrder(subfolderName)

  return res.status(200).send("OK")
}

// Rename subfolder
async function renameSubfolder(req, res) {
  const { accessToken } = res.locals
  const { siteName, folderName, subfolderName, newSubfolderName } = req.params

  // Rename subfolder by:
  // 1. Creating new files in the newSubfolderName folder
  // 2. Modifying the `third_nav_title` of each new file to reflect the newSubfolderName
  // 3. Delete existing files in the previous subfolderName folder
  const currentSubfolderPath = `${folderName}/${subfolderName}`
  const CurrentIsomerFile = new File(accessToken, siteName)
  const currDataType = new CollectionPageType(currentSubfolderPath)
  CurrentIsomerFile.setFileType(currDataType)

  const newSubfolderPath = `${folderName}/${newSubfolderName}`
  const NewIsomerFile = new File(accessToken, siteName)
  const newDataType = new CollectionPageType(newSubfolderPath)
  NewIsomerFile.setFileType(newDataType)

  const filesToBeModified = await CurrentIsomerFile.list()

  await Bluebird.mapSeries(filesToBeModified, async (fileInfo) => {
    const { fileName } = fileInfo

    // Read existing file content
    const { content, sha } = await CurrentIsomerFile.read(fileName)

    // Handle keep file differently
    if (fileName === ".keep") {
      await NewIsomerFile.create(fileName, content)
      return CurrentIsomerFile.delete(fileName, sha)
    }

    const decodedContent = Base64.decode(content)
    const results = decodedContent.split("---")
    const frontMatter = yaml.parse(results[1]) // get the front matter as an object
    const mdBody = results.slice(2).join("---")

    // Modify `third_nav_title` and save as new file in newSubfolderName
    const newFrontMatter = {
      ...frontMatter,
      third_nav_title: deslugifyCollectionName(newSubfolderName),
    }

    const newContent = [
      "---\n",
      yaml.stringify(newFrontMatter),
      "---\n",
      mdBody,
    ].join("")

    const encodedNewContent = Base64.encode(newContent)

    await NewIsomerFile.create(fileName, encodedNewContent)

    // Delete existing file in subfolderName
    return CurrentIsomerFile.delete(fileName, sha)
  })

  // // Update collection config
  const collectionConfig = new CollectionConfig(
    accessToken,
    siteName,
    folderName
  )
  await collectionConfig.renameSubfolderInOrder(subfolderName, newSubfolderName)

  return res.status(200).send("OK")
}

router.get("/all", attachReadRouteHandlerWrapper(listAllFolderContent))
router.delete(
  "/:folderName/subfolder/:subfolderName",
  attachRollbackRouteHandlerWrapper(deleteSubfolder)
)
router.post(
  "/:folderName/subfolder/:subfolderName/rename/:newSubfolderName",
  attachRollbackRouteHandlerWrapper(renameSubfolder)
)

module.exports = router
