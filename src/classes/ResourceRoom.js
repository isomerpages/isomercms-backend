const Bluebird = require("bluebird")
const _ = require("lodash")

// Import Classes
const { Config } = require("@classes/Config.js")
const { File, ResourceType, DataType } = require("@classes/File.js")
const { Resource } = require("@classes/Resource.js")

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
const RESOURCE_ROOM_INDEX_PATH = "index.html"
const NAV_FILE_NAME = "navigation.yml"

const { Base64 } = require("js-base64")

class ResourceRoom {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async get() {
    const config = new Config(this.accessToken, this.siteName)
    const { content } = await config.read()
    const contentObject = sanitizedYamlParse(Base64.decode(content))

    return contentObject.resources_name
  }

  async create(resourceRoom) {
    const config = new Config(this.accessToken, this.siteName)
    const { content, sha } = await config.read()
    const contentObject = sanitizedYamlParse(Base64.decode(content))

    contentObject.resources_name = resourceRoom

    const newContent = Base64.encode(sanitizedYamlStringify(contentObject))

    // Create index file in resourceRoom
    const IsomerIndexFile = new File(this.accessToken, this.siteName)
    const resourceType = new ResourceType(resourceRoom)
    IsomerIndexFile.setFileType(resourceType)
    const resourceRoomObject = {
      layout: "resources",
      title: deslugifyCollectionName(resourceRoom),
    }
    const resourceRoomFrontMatter = sanitizedYamlStringify(resourceRoomObject)
    const resourceRoomIndexContent = [
      "---\n",
      resourceRoomFrontMatter,
      "---",
    ].join("")
    await IsomerIndexFile.create(
      RESOURCE_ROOM_INDEX_PATH,
      Base64.encode(resourceRoomIndexContent)
    )

    await config.update(newContent, sha)

    const nav = new File(this.accessToken, this.siteName)
    const dataType = new DataType()
    nav.setFileType(dataType)
    const { content: navContent, sha: navSha } = await nav.read(NAV_FILE_NAME)
    const navContentObject = sanitizedYamlParse(Base64.decode(navContent))

    navContentObject.links.push({
      title: deslugifyCollectionName(resourceRoom),
      resource_room: true,
    })
    const newNavContent = Base64.encode(
      sanitizedYamlStringify(navContentObject)
    )

    await nav.update(NAV_FILE_NAME, newNavContent, navSha)

    return resourceRoom
  }

  async rename(newResourceRoom) {
    // Add resource room to config
    const config = new Config(this.accessToken, this.siteName)
    const { content: configContent, sha: configSha } = await config.read()
    const contentObject = sanitizedYamlParse(Base64.decode(configContent))

    // Obtain existing resourceRoomName
    const resourceRoomName = contentObject.resources_name
    contentObject.resources_name = newResourceRoom
    const newContent = Base64.encode(sanitizedYamlStringify(contentObject))

    const commitMessage = `Rename resource room from ${resourceRoomName} to ${newResourceRoom}`

    await config.update(newContent, configSha)

    // Rename resource room in nav if it exists
    const nav = new File(this.accessToken, this.siteName)
    const dataType = new DataType()
    nav.setFileType(dataType)
    const { content: navContent, sha: navSha } = await nav.read(NAV_FILE_NAME)
    const navContentObject = sanitizedYamlParse(Base64.decode(navContent))

    const newNavLinks = navContentObject.links.map((link) => {
      if (link.resource_room === true) {
        return {
          title: deslugifyCollectionName(newResourceRoom),
          resource_room: true,
        }
      }
      return link
    })
    const newNavContentObject = {
      ...navContentObject,
      links: newNavLinks,
    }
    const newNavContent = Base64.encode(
      sanitizedYamlStringify(newNavContentObject)
    )
    await nav.update(NAV_FILE_NAME, newNavContent, navSha)

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
      if (item.path === resourceRoomName && item.type === "tree") {
        // Rename old subdirectory to new name
        newGitTree.push({
          ...item,
          path: newResourceRoom,
        })
      } else if (
        item.path.startsWith(`${resourceRoomName}/`) &&
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
    const resourceType = new ResourceType(resourceRoomName)
    IsomerFile.setFileType(resourceType)
    const {
      content: resourceFileContent,
      sha: resourceFileSha,
    } = await IsomerFile.read(RESOURCE_ROOM_INDEX_PATH)
    const decodedContent = Base64.decode(resourceFileContent)
    const resourceFrontMatterObj = sanitizedYamlParse(
      decodedContent.split("---")[1]
    )
    resourceFrontMatterObj.title = deslugifyCollectionName(newResourceRoom)
    const resourceFrontMatter = sanitizedYamlStringify(resourceFrontMatterObj)
    const resourceIndexContent = ["---\n", resourceFrontMatter, "---"].join("")
    await IsomerFile.update(
      RESOURCE_ROOM_INDEX_PATH,
      Base64.encode(resourceIndexContent),
      resourceFileSha
    )

    return newResourceRoom
  }

  async delete() {
    // Delete resource in config
    const config = new Config(this.accessToken, this.siteName)
    const { content, sha } = await config.read()
    const contentObject = sanitizedYamlParse(Base64.decode(content))

    // Obtain resourceRoomName
    const resourceRoomName = contentObject.resources_name

    // Delete resourcses_name from Config
    delete contentObject.resources_name
    const newContent = Base64.encode(sanitizedYamlStringify(contentObject))

    // Delete resource room in nav if it exists
    const nav = new File(this.accessToken, this.siteName)
    const dataType = new DataType()
    nav.setFileType(dataType)
    const { content: navContent, sha: navSha } = await nav.read(NAV_FILE_NAME)
    const navContentObject = sanitizedYamlParse(Base64.decode(navContent))

    // Assumption: only a single resource room exists
    const newNavLinks = navContentObject.links.filter(
      (link) => link.resource_room !== true
    )
    const newNavContentObject = {
      ...navContentObject,
      links: newNavLinks,
    }
    const newNavContent = Base64.encode(
      sanitizedYamlStringify(newNavContentObject)
    )
    await nav.update(NAV_FILE_NAME, newNavContent, navSha)

    // Delete all resources and resourcePages
    const IsomerResource = new Resource(this.accessToken, this.siteName)
    const resources = await IsomerResource.list(resourceRoomName)

    if (!_.isEmpty(resources)) {
      await Bluebird.map(resources, async (resource) =>
        IsomerResource.delete(resourceRoomName, resource.dirName)
      )
    }

    // Delete index file in resourceRoom
    const IsomerIndexFile = new File(this.accessToken, this.siteName)
    const resourceType = new ResourceType(resourceRoomName)
    IsomerIndexFile.setFileType(resourceType)
    const { sha: deleteSha } = await IsomerIndexFile.read(
      RESOURCE_ROOM_INDEX_PATH
    )
    await IsomerIndexFile.delete(RESOURCE_ROOM_INDEX_PATH, deleteSha)

    await config.update(newContent, sha)
  }
}

module.exports = { ResourceRoom }
