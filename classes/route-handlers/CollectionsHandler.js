import DirectoryService from "../class-services/DirectoryService"

const yaml = require("yaml")

import GitHubService from "../class-services/GitHubService"
import CollectionConfigService from "../class-services/CollectionConfigService"
import FileService from "../class-services/FileService"

const {
  ConflictError,
  protectedFolderConflictErrorMsg,
} = require("@errors/ConflictError")

const {
  deslugifyCollectionName,
} = require("@utils/utils.js")

const ISOMER_TEMPLATE_DIRS = ["_data", "_includes", "_site", "_layouts"]
const ISOMER_TEMPLATE_PROTECTED_DIRS = [
  "data",
  "includes",
  "site",
  "layouts",
  "files",
  "images",
  "misc",
  "pages",
]

class CollectionsHandler {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  /**
   * Returns list of collection names at root
   * @returns {Promise<{}|*>} List of collection names
   */
  async list() {
    // Retrieve all file objects at root
    const rootDirService = new DirectoryService(this.accessToken, this.siteName, '')
    const respData = rootDirService.list()

    // Filter out collection files and format '_TestCollection' -> 'TestCollection'
    return respData.filter((elem) => {
      return  elem.type === "dir" &&
        !ISOMER_TEMPLATE_DIRS.includes(elem.name) &&
        elem.name.slice(0, 1) === "_"
    }).map((elem) => {
      return elem.name.slice(1)
    })
  }

  async create(collectionName) {
    // Check if collection name is a protected directory name
    if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(collectionName))
      throw new ConflictError(protectedFolderConflictErrorMsg(collectionName))

    // Create new collection by populating path with a collection.yml
    const configService = new CollectionConfigService(this.accessToken, this.siteName, collectionName)
    await configService.create()

    // Update nav file to include collection
    // TODO create new nav that inherits File instead?
    const navFileService = new FileService(this.accessToken, this.siteName, '_data/', 'navigation.yml')
    const { content: navContent, sha: navSha } = await navFileService.read()
    const navContentObject = yaml.parse(navContent)

    navContentObject.links.push({
      title: deslugifyCollectionName(collectionName),
      collection: collectionName,
    })

    const newNavContent = yaml.stringify(navContentObject)
    await navFileService.update(newNavContent, navSha)
  }

  async delete(collectionName, currentCommitSha, treeSha) {
    // Delete collection directory
    const collectionService = new DirectoryService(this.accessToken, this.siteName, `_${collectionName}`)
    await collectionService.delete(currentCommitSha, treeSha)

    // Delete collection in nav if it exists
    // TODO create new nav that inherits File instead?
    const navFileService = new FileService(this.accessToken, this.siteName, '_data/', 'navigation.yml')
    const { content: navContent, sha: navSha } = await navFileService.read()
    const navContentObject = yaml.parse(navContent)

    const newNavLinks = navContentObject.links.filter(
      (link) => link.collection !== collectionName
    )
    const newNavContentObject = {
      ...navContentObject,
      links: newNavLinks,
    }
    const newNavContent = yaml.stringify(newNavContentObject)
    await navFileService.update(newNavContent, navSha)
  }

  async rename(oldCollectionName, newCollectionName, currentCommitSha, treeSha) {
    // Rename collection in nav if it exists
    // TODO create new nav that inherits File instead?
    const navFileService = new FileService(this.accessToken, this.siteName, '_data/', 'navigation.yml')
    const { content: navContent, sha: navSha } = await navFileService.read()
    const navContentObject = yaml.parse(navContent)

    const newNavLinks = navContentObject.links.map((link) => {
      if (link.collection === oldCollectionName) {
        return {
          title: deslugifyCollectionName(newCollectionName),
          collection: newCollectionName,
        }
      }
      return link
    })
    const newNavContentObject = {
      ...navContentObject,
      links: newNavLinks,
    }

    const newNavContent = Base64.encode(yaml.stringify(newNavContentObject))
    await navFileService.update(newNavContent, navSha)

    // Rename collection directory
    const collectionService = new DirectoryService(this.accessToken, this.siteName, `_${oldCollectionName}`)
    await collectionService.update(`_${newCollectionName}`, currentCommitSha, treeSha)
  }
}

export default CollectionsHandler