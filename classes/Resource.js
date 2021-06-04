const Bluebird = require("bluebird")
const _ = require("lodash")
const yaml = require("yaml")

<<<<<<< HEAD
// Import classes
const { File, ResourceCategoryType, ResourcePageType } = require("./File.js")
const { Directory, ResourceRoomType } = require("./Directory.js")
const {
  getCommitAndTreeSha,
  getTree,
  sendTree,
  deslugifyCollectionName,
} = require("../utils/utils.js")
=======
// Import classes 
const { File, ResourceCategoryType, ResourcePageType } = require('@classes/File.js')
const { Directory, ResourceRoomType } = require('@classes/Directory.js')
const { getCommitAndTreeSha, getTree, sendTree, deslugifyCollectionName } = require('@utils/utils.js')
>>>>>>> refactor: replace imports with aliases for Classes

// Constants
const RESOURCE_INDEX_PATH = "index.html"

class Resource {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async list(resourceRoomName) {
    const IsomerDir = new Directory(this.accessToken, this.siteName)
    const resourceRoomType = new ResourceRoomType(resourceRoomName)
    IsomerDir.setDirType(resourceRoomType)
    return IsomerDir.list()
  }

  async create(resourceRoomName, resourceName) {
    // Create an index file in the resource folder
    const IsomerFile = new File(this.accessToken, this.siteName)
    const resourceType = new ResourceCategoryType(
      resourceRoomName,
      resourceName
    )
    IsomerFile.setFileType(resourceType)
    const resourceObject = {
      layout: "resources-alt",
      title: deslugifyCollectionName(resourceName),
    }
    const resourceFrontMatter = yaml.stringify(resourceObject)
    const resourceIndexContent = ["---\n", resourceFrontMatter, "---"].join("")
    return IsomerFile.create(
      `${RESOURCE_INDEX_PATH}`,
      Base64.encode(resourceIndexContent)
    )
  }

  async rename(resourceRoomName, resourceName, newResourceName) {
    const commitMessage = `Rename resource category from ${resourceName} to ${newResourceName}`
    const { currentCommitSha, treeSha } = await getCommitAndTreeSha(
      this.siteName,
      this.accessToken
    )
    const gitTree = await getTree(this.siteName, this.accessToken, treeSha)
    const newGitTree = []
    let resourceRoomTreeSha
    // Retrieve all git trees of other items
    gitTree.forEach((item) => {
      if (item.path === resourceRoomName) {
        resourceRoomTreeSha = item.sha
      } else {
        newGitTree.push(item)
      }
    })
    const resourceRoomTree = await getTree(
      this.siteName,
      this.accessToken,
      resourceRoomTreeSha
    )
    resourceRoomTree.forEach((item) => {
      // We need to append resource room to the file path because the path is relative to the subtree
      if (item.path === resourceName) {
        newGitTree.push({
          ...item,
          path: `${resourceRoomName}/${newResourceName}`,
        })
      } else {
        newGitTree.push({
          ...item,
          path: `${resourceRoomName}/${item.path}`,
        })
      }
    })
    await sendTree(
      newGitTree,
      currentCommitSha,
      this.siteName,
      this.accessToken,
      commitMessage
    )

    // We also need to update the title in the index.html file
    const IsomerFile = new File(this.accessToken, this.siteName)
    const resourceType = new ResourceCategoryType(
      resourceRoomName,
      newResourceName
    )
    IsomerFile.setFileType(resourceType)
    const { content, sha } = await IsomerFile.read(RESOURCE_INDEX_PATH)
    const decodedContent = Base64.decode(content)
    const resourceFrontMatterObj = yaml.parse(decodedContent.split("---")[1])
    resourceFrontMatterObj.title = deslugifyCollectionName(newResourceName)
    const resourceFrontMatter = yaml.stringify(resourceFrontMatterObj)
    const resourceIndexContent = ["---\n", resourceFrontMatter, "---"].join("")
    await IsomerFile.update(
      RESOURCE_INDEX_PATH,
      Base64.encode(resourceIndexContent),
      sha
    )
  }

  async delete(resourceRoomName, resourceName) {
    // Delete index file in resource
    const IsomerIndexFile = new File(this.accessToken, this.siteName)
    const resourceType = new ResourceCategoryType(
      resourceRoomName,
      resourceName
    )
    IsomerIndexFile.setFileType(resourceType)
    const { sha } = await IsomerIndexFile.read(`${RESOURCE_INDEX_PATH}`)
    await IsomerIndexFile.delete(`${RESOURCE_INDEX_PATH}`, sha)

    // Delete all resourcePages in resource
    // 1. List all resourcePages in resource
    const IsomerFile = new File(this.accessToken, this.siteName)
    const resourcePageType = new ResourcePageType(
      resourceRoomName,
      resourceName
    )
    IsomerFile.setFileType(resourcePageType)
    const resourcePages = await IsomerFile.list()

    if (_.isEmpty(resourcePages)) return

    // 2. Delete all resourcePages in resource
    await Bluebird.each(resourcePages, async (resourcePage) => {
      const { sha: pageSha } = await IsomerFile.read(resourcePage.fileName)
      return IsomerFile.delete(resourcePage.fileName, pageSha)
    })
  }
}

module.exports = { Resource }
