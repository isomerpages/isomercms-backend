
const {
  ConflictError,
  protectedFolderConflictErrorMsg,
} = require("@errors/ConflictError")
const { DirectoryService } = require("@services/github/DirectoryService")
const { CollectionConfigService } = require("@services/config/CollectionConfigService")

const NAV_FILE_NAME = "navigation.yml"
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


class CollectionService {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.directoryService = new DirectoryService(this.accessToken, this.siteName)
    this.collectionConfigService = new CollectionConfigService(this.accessToken, this.siteName)
  }

  async list() {
    const repoRootContent = this.directoryService.getContents("")
    return repoRootContent.reduce((acc, curr) => {
      if (
        curr.type === "dir" &&
        !ISOMER_TEMPLATE_DIRS.includes(curr.name) &&
        curr.name.slice(0, 1) === "_"
      )
        acc.push(curr.path.slice(1))
      return acc
    }, [])
  }

  async create(collectionName, orderArray) {
    if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(collectionName))
      throw new ConflictError(protectedFolderConflictErrorMsg(collectionName))

    // Handle new items, TBD
    // // How to get file info??
    // const contentObject = {
    //   collections: {
    //     [collectionName]: {
    //       output: true,
    //       order: orderArray || [],
    //     },
    //   },
    // }

    // const newContent = yaml.stringify(contentObject)
    // await this.collectionConfigService.create(collectionName, newContent)

    // Navigation stuff, TBD
    // const nav = new File(this.accessToken, this.siteName)
    // const dataType = new DataType()
    // nav.setFileType(dataType)
    // const { content: navContent, sha: navSha } = await nav.read(NAV_FILE_NAME)
    // const navContentObject = yaml.parse(Base64.decode(navContent))

    // navContentObject.links.push({
    //   title: deslugifyCollectionName(collectionName),
    //   collection: collectionName,
    // })
    // const newNavContent = Base64.encode(yaml.stringify(navContentObject))

    // await nav.update(NAV_FILE_NAME, newNavContent, navSha)
  }

  async delete(collectionName, currentCommitSha, treeSha) {
    const parsedCollectionName = `_${collectionName}`

    this.directoryService.delete(parsedCollectionName, currentCommitSha, treeSha)
    
    // Navigation stuff, TBD

    // // Delete collection in nav if it exists
    // const nav = new File(this.accessToken, this.siteName)
    // const dataType = new DataType()
    // nav.setFileType(dataType)
    // const { content: navContent, sha: navSha } = await nav.read(NAV_FILE_NAME)
    // const navContentObject = yaml.parse(Base64.decode(navContent))

    // const newNavLinks = navContentObject.links.filter(
    //   (link) => link.collection !== collectionName
    // )
    // const newNavContentObject = {
    //   ...navContentObject,
    //   links: newNavLinks,
    // }
    // const newNavContent = Base64.encode(yaml.stringify(newNavContentObject))
    // await nav.update(NAV_FILE_NAME, newNavContent, navSha)
  }

  async rename(collectionName, newCollectionName, currentCommitSha, treeSha) {
    const parsedCollectionName = `_${collectionName}`
    const parsedNewCollectionName = `_${newCollectionName}`

    this.directoryService.rename(parsedCollectionName, parsedNewCollectionName, currentCommitSha, treeSha)

    // Navigation stuff, TBD

    // // Rename collection in nav if it exists
    // const nav = new File(this.accessToken, this.siteName)
    // const dataType = new DataType()
    // nav.setFileType(dataType)
    // const { content: navContent, sha: navSha } = await nav.read(NAV_FILE_NAME)
    // const navContentObject = yaml.parse(Base64.decode(navContent))

    // const newNavLinks = navContentObject.links.map((link) => {
    //   if (link.collection === oldCollectionName) {
    //     return {
    //       title: deslugifyCollectionName(newCollectionName),
    //       collection: newCollectionName,
    //     }
    //   }
    //   return link
    // })
    // const newNavContentObject = {
    //   ...navContentObject,
    //   links: newNavLinks,
    // }
    // const newNavContent = Base64.encode(yaml.stringify(newNavContentObject))
    // await nav.update(NAV_FILE_NAME, newNavContent, navSha)
  }
}

module.exports = {
  CollectionService
}
