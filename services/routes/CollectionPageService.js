const { FileService } = require("@services/github/FileService")
const { CollectionConfigService } = require("@services/config/CollectionConfigService")
const { CollectionService } = require("@services/config/CollectionService")

class CollectionPageService {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.fileService = new FileService(this.accessToken, this.siteName)
    this.collectionConfigService = new CollectionConfigService(this.accessToken, this.siteName)
    this.collectionService = new CollectionService(this.accessToken, this.siteName)
  }

  async create(fileName, collectionName, content) {
    const parsedCollectionName = `_${collectionName}`
  
    // Check if collection already exists
    const collections = await this.collectionService.list()
    if (!collections.includes(collectionName)) {
      await this.collectionService.create(collectionName)
    }

    // Add to collection.yml
    this.collectionConfigService.addItemToOrder(collectionName, fileName)

    // We want to make sure that the front matter has no third nav title parameter
    // eslint-disable-next-line no-unused-vars
    const [unused, encodedFrontMatter, pageContent] = content.split("---")
    const frontMatter = yaml.parse(encodedFrontMatter)
    delete frontMatter.third_nav_title
    const newFrontMatter = yaml.stringify(frontMatter)
    const newContent = ["---\n", newFrontMatter, "---", pageContent].join("")

    return this.fileService.create(fileName, newContent, parsedCollectionName)
  }

  async read(fileName, collectionName) {
    const parsedCollectionName = `_${collectionName}`
    return this.fileService.read(fileName, parsedCollectionName)
  }

  async update(fileName, collectionName, newContent, sha) {
    const parsedCollectionName = `_${collectionName}`
    return this.fileService.update(fileName, newContent, parsedCollectionName, sha)
  }

  async delete(fileName, collectionName, sha) {
    const parsedCollectionName = `_${collectionName}`
    
    // Remove from collection.yml
    this.collectionConfigService.deleteItemFromOrder(collectionName, fileName)

    return this.fileService.delete(fileName, parsedCollectionName, sha)
  }

  async rename(fileName, collectionName, newFileName) {
    const { content, sha } = await this.read(fileName, collectionName)
    await this.create(newFileName, collectionName, content)
    await this.delete(fileName, collectionName, sha)
    await this.collectionConfigService.updateItemInOrder(collectionName, fileName, newFileName)
  }
}

module.exports = {
  CollectionPageService
}
