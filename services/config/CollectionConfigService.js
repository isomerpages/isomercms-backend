const { FileService } = require("@services/github/FileService")

const COLLECTION_CONFIG_NAME = 'collection.yml'

class CollectionConfigService {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.fileService = new FileService(this.accessToken, this.siteName)
  }

  async create(collectionName, content) {
    const fileDir = `_${collectionName}`
    return this.fileService.create(COLLECTION_CONFIG_NAME, content, fileDir)
  }

  async delete(collectionName) {
    const fileDir = `_${collectionName}`
    return this.fileService.delete(COLLECTION_CONFIG_NAME, fileDir)
  }

  async read(collectionName) {
    const fileDir = `_${collectionName}`
    return this.fileService.read(COLLECTION_CONFIG_NAME, fileDir)
  }

  async addItemToOrder(collectionName, item, index) {
    const { content, sha } = await this.read(collectionName)
    const fileDir = `_${collectionName}`

    let newIndex = index
    if (index === undefined) {
      if (item.split("/").length === 2) {
        // if file in subfolder, get index of last file in subfolder
        newIndex =
          _.findLastIndex(
            content.collections[collectionName].order,
            (f) => f.split("/")[0] === item.split("/")[0]
          ) + 1
      } else {
        // get index of last file in collection
        newIndex = content.collections[collectionName].order.length
      }
    }
    content.collections[collectionName].order.splice(newIndex, 0, item)
    const newContent = yaml.stringify(content)

    return this.fileService.update(COLLECTION_CONFIG_NAME, newContent, fileDir, sha)
  }

  async deleteItemFromOrder(collectionName, item) {
    const { content, sha } = await this.read(collectionName)
    const fileDir = `_${collectionName}`

    const index = content.collections[collectionName].order.indexOf(item)
    content.collections[collectionName].order.splice(index, 1)
    const newContent = yaml.stringify(content)

    return this.fileService.update(COLLECTION_CONFIG_NAME, newContent, fileDir, sha)
  }

  async updateItemInOrder(collectionName, oldItem, newItem) {
    const { content, sha } = await this.read(collectionName)
    const fileDir = `_${collectionName}`

    const index = content.collections[collectionName].order.indexOf(oldItem)
    content.collections[collectionName].order.splice(index, 1)
    content.collections[collectionName].order.splice(index, 0, newItem)
    const newContent = yaml.stringify(content)

    return this.fileService.update(COLLECTION_CONFIG_NAME, newContent, fileDir, sha)
  }

  async deleteSubfolderFromOrder(collectionName, subfolder) {
    const { content, sha } = await this.read(collectionName)
    const fileDir = `_${collectionName}`

    const filteredOrder = content.collections[collectionName].order.filter(
      (item) => !item.includes(`${subfolder}/`)
    )
    const newContentObject = _.cloneDeep(content)
    newContentObject.collections[collectionName].order = filteredOrder
    const newContent = yaml.stringify(newContentObject)

    return this.fileService.update(COLLECTION_CONFIG_NAME, newContent, fileDir, sha)
  }

  async renameSubfolderInOrder(collectionName, subfolder, newSubfolderName) {
    const { content, sha } = await this.read(collectionName)
    const fileDir = `_${collectionName}`

    const renamedOrder = content.collections[collectionName].order.map(
      (item) => {
        if (item.includes(`${subfolder}/`))
          return `${newSubfolderName}/${item.split("/")[1]}`
        return item
      }
    )
    const newContentObject = _.cloneDeep(content)
    newContentObject.collections[collectionName].order = renamedOrder
    const newContent = yaml.stringify(newContentObject)

    return this.fileService.update(COLLECTION_CONFIG_NAME, newContent, fileDir, sha)
  }
}

module.exports = {
  CollectionConfigService
}
