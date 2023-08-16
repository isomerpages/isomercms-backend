const Bluebird = require("bluebird")
const { Base64 } = require("js-base64")
const _ = require("lodash")

// Import classes
const { NotFoundError } = require("@errors/NotFoundError")

const { Directory, ResourceRoomType } = require("@classes/Directory.js")
const {
  File,
  ResourceCategoryType,
  ResourcePageType,
} = require("@classes/File.js")

const {
  getCommitAndTreeSha,
  getTree,
  sendTree,
  deslugifyCollectionName,
} = require("@utils/utils.js")
const {
  sanitizedYamlParse,
  sanitizedYamlStringify,
} = require("@utils/yaml-utils")

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
    const resourceFrontMatter = sanitizedYamlStringify(resourceObject)
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
    const gitTree = await getTree(
      this.siteName,
      this.accessToken,
      treeSha,
      true
    )
    const newGitTree = []
    gitTree.forEach((item) => {
      // We need to append resource room to the file path because the path is relative to the subtree
      if (
        item.path === `${resourceRoomName}/${resourceName}` &&
        item.type === "tree"
      ) {
        // Rename old subdirectory to new name
        newGitTree.push({
          ...item,
          path: `${resourceRoomName}/${newResourceName}`,
        })
      } else if (
        item.path.startsWith(`${resourceRoomName}/${resourceName}/`) &&
        item.type !== "tree"
      ) {
        // Delete old subdirectory items
        newGitTree.push({
          ...item,
          sha: null,
        })
      }
    })
    await sendTree(
      newGitTree,
      treeSha,
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
    const resourceFrontMatterObj = sanitizedYamlParse(
      decodedContent.split("---")[1]
    )
    resourceFrontMatterObj.title = deslugifyCollectionName(newResourceName)
    const resourceFrontMatter = sanitizedYamlStringify(resourceFrontMatterObj)
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
    let resourcePages = []
    try {
      resourcePages = await IsomerFile.list()
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error
    }

    if (_.isEmpty(resourcePages)) return

    // 2. Delete all resourcePages in resource
    await Bluebird.each(resourcePages, async (resourcePage) => {
      const { sha: pageSha } = await IsomerFile.read(resourcePage.fileName)
      return IsomerFile.delete(resourcePage.fileName, pageSha)
    })
  }
}

module.exports = { Resource }
