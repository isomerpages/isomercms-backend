
const {
  ConflictError,
  protectedFolderConflictErrorMsg,
} = require("@errors/ConflictError")
const { DirectoryService } = require("@services/github/DirectoryService")
const { CollectionConfigService } = require("@services/config/CollectionConfigService")

const NAV_FILE_NAME = "navigation.yml"

class CollectionService {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.fileService = new FileService(this.accessToken, this.siteName)
    this.directoryService = new DirectoryService(this.accessToken, this.siteName)
    this.collectionConfigService = new CollectionConfigService(this.accessToken, this.siteName)
  }

  async list(collectionName) {
    const repoRootContent = this.directoryService.getContents(`_${collectionName}`)
    return repoRootContent.reduce((acc, curr) => {
      if (curr.type === "dir") acc.push(curr.path.slice(1))
      return acc
    }, [])
  }

  async create(collectionName, thirdNavTitle, orderArray) {
    await this.fileService.create(".keep", "", `_${collectionName}/${thirdNavTitle}`)
    
    // Handle movement and update collection.yml
    // orderArray.forEach(item => {
    //   await this.collectionConfigService.update(collectionName, newContent)
    // })

    
  }

  async delete(collectionName, currentCommitSha, treeSha) {
    const parsedDirName = `_${collectionName}/${thirdNavTitle}`

    this.directoryService.delete(parsedDirName, currentCommitSha, treeSha)
    // UPDATE COLLECTION.yml
  }

  async rename(collectionName, newCollectionName, currentCommitSha, treeSha) {
    const parsedCollectionName = `_${collectionName}`
    const parsedNewCollectionName = `_${newCollectionName}`

    this.directoryService.rename(parsedCollectionName, parsedNewCollectionName, currentCommitSha, treeSha)

    // Modify collection.yml and third_nav_title in front matter
  }
}

module.exports = {
  CollectionService
}
