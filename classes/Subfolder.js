<<<<<<< HEAD
const { CollectionConfig } = require("./Config.js")
const { File, CollectionPageType } = require("./File.js")
const { Directory, FolderType } = require("./Directory.js")
=======
const { CollectionConfig } = require('@classes/Config.js')
const { File, CollectionPageType } = require('@classes/File.js')
const { Directory, FolderType } = require('@classes/Directory.js')
>>>>>>> refactor: replace imports with aliases for Classes

class Subfolder {
  constructor(accessToken, siteName, collectionName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.collectionName = collectionName
  }

  async list() {
    const IsomerDirectory = new Directory(this.accessToken, this.siteName)
    const folderType = new FolderType(`_${this.collectionName}`)
    IsomerDirectory.setDirType(folderType)
    const repoRootContent = await IsomerDirectory.list()

    const allSubfolders = repoRootContent.reduce((acc, curr) => {
      if (curr.type === "dir") {
        const pathTokens = curr.path.split("/")
        acc.push(pathTokens.slice(1).join("/"))
      }
      return acc
    }, [])
    return allSubfolders
  }

  async create(subfolderName) {
    // Update collection.yml
    const collectionConfig = new CollectionConfig(
      this.accessToken,
      this.siteName,
      this.collectionName
    )
    await collectionConfig.addItemToOrder(`${subfolderName}/.keep`)

    // Create placeholder file
    const IsomerFile = new File(this.accessToken, this.siteName)
    const dataType = new CollectionPageType(this.collectionName)
    IsomerFile.setFileType(dataType)
    await IsomerFile.create(`${subfolderName}/.keep`, "")
  }
}

module.exports = { Subfolder }
