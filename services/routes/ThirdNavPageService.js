const { FileService } = require("@services/github/FileService")
const { CollectionConfigService } = require("@services/config/CollectionConfigService")
const { CollectionService } = require("@services/config/CollectionService")
const { ThirdNavService } = require("@services/config/ThirdNavService")

class ThirdNavPageService {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.fileService = new FileService(this.accessToken, this.siteName)
    this.collectionConfigService = new CollectionConfigService(this.accessToken, this.siteName)
    this.collectionService = new CollectionService(this.accessToken, this.siteName)
    this.thirdNavService = new ThirdNavService(this.accessToken, this.siteName)
  }

  async create(fileName, collectionName, thirdNavTitle, content) {
    const parsedDir = `_${collectionName}/${thirdNavTitle}`
  
    // Check if collection already exists
    const collections = await this.collectionService.list()
    if (!collections.includes(collectionName)) {
      await this.collectionService.create(collectionName)
    }
    const thirdNavs = await this.thirdNavService.list()
    if (!thirdNavs.includes(thirdNavTitle)) {
      await this.thirdNavService.create(collectionName, thirdNavTitle)
    }

    // Add to collection.yml
    this.collectionConfigService.addItemToOrder(collectionName, `${thirdNavTitle}/${fileName}`)

    // We want to make sure that the front matter has correct third nav title parameter
    // eslint-disable-next-line no-unused-vars
    const [unused, encodedFrontMatter, pageContent] = content.split("---")
    const frontMatter = yaml.parse(encodedFrontMatter)
    frontMatter.third_nav_title = thirdNavTitle
    const newFrontMatter = yaml.stringify(frontMatter)
    const newContent = ["---\n", newFrontMatter, "---", pageContent].join("")

    return this.fileService.create(fileName, newContent, parsedDir)
  }

  async read(fileName, collectionName, thirdNavTitle) {
    const parsedDir = `_${collectionName}/${thirdNavTitle}`
    return this.fileService.read(fileName, parsedDir)
  }

  async update(fileName, collectionName, thirdNavTitle, newContent, sha) {
    const parsedDir = `_${collectionName}/${thirdNavTitle}`
    return this.fileService.update(fileName, newContent, parsedDir, sha)
  }

  async delete(fileName, collectionName, thirdNavTitle, sha) {
    const parsedDir = `_${collectionName}/${thirdNavTitle}`
    
    // Remove from collection.yml
    this.collectionConfigService.deleteItemFromOrder(collectionName, `${thirdNavTitle}/${fileName}`)

    return this.fileService.delete(fileName, parsedDir, sha)
  }

  async rename(fileName, collectionName, thirdNavTitle, newFileName) {
    const { content, sha } = await this.read(fileName, collectionName)
    await this.create(newFileName, collectionName, content)
    await this.delete(fileName, collectionName, sha)
    await this.collectionConfigService.updateItemInOrder(collectionName, `${thirdNavTitle}/${fileName}`, `${thirdNavTitle}/${newFileName}`)
  }
}

module.exports = {
  ThirdNavPageService
}
