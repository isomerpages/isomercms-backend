const _ = require("lodash")
const yaml = require("yaml")

import FileService from "./FileService"

class CollectionConfigService {
  /**
   * @constructor
   * @param accessToken {string}
   * @param siteName {string}
   * @param collectionName {string} without _
   */
  constructor(accessToken, siteName, collectionName) {
    this.file = new FileService(accessToken, siteName, `_${collectionName}`, 'collection.yml')
    this.collectionName = collectionName
  }

  /**
   * Create new collection.yml file
   * @returns {Promise<{sha}>}
   */
  async create() {
    const contentObject = {
      collections: {
        [this.collectionName]: {
          output: true,
          order:  [],
        },
      },
    }
    const stringifiedContent = yaml.stringify(contentObject)
    return await this.file.create(stringifiedContent)
  }

  /**
   * Get collection.yml contents
   * @returns {Promise<{content, sha}>}
   */
  async read() {
    return await this.file.read()
  }

  /**
   * Delete collection.yml
   * @param sha
   * @returns {Promise<void>}
   */
  async delete(sha) {
    return await this.file.delete(sha)
  }

  /**
   * Add file to collection.yml
   * @param collectionFilePath {string} File path within collection e.g. subfolder/filename
   * @param index {number=}
   * @returns {Promise<void>}
   */
  async addItemtoOrder(collectionFilePath, index) {
    const { collectionName } = this.collectionName
    const { content, sha } = await this.read()

    let newIndex = index
    if (index === undefined) {
      if (collectionFilePath.split("/").length === 2) {
        // if file in subfolder, get index of last file in subfolder
        newIndex =
          _.findLastIndex(
            content.collections[collectionName].order,
            (f) => f.split("/")[0] === collectionFilePath.split("/")[0]
          ) + 1
      } else {
        // get index of last file in collection
        newIndex = content.collections[collectionName].order.length
      }
    }

    content.collections[collectionName].order.splice(newIndex, 0, collectionFilePath)
    const newContent = yaml.stringify(content)

    await this.file.update(newContent, sha)
  }

  /**
   * Delete file from collection.yml
   * @param collectionFilePath {string} File path within collection e.g. subfolder/filename
   * @returns {Promise<{item, index}>}
   */
  async deleteItemFromOrder(collectionFilePath) {
    const { collectionName } = this.collectionName
    const { content, sha } = await this.read()

    const index = content.collections[collectionName].order.indexOf(collectionFilePath)
    content.collections[collectionName].order.splice(index, 1)
    const newContent = yaml.stringify(content)

    await this.file.update(newContent, sha)
    return { index, item: collectionFilePath }
  }

  /**
   *
   * @param oldCollectionFilePath {string} Old file path within collection e.g. subfolder/filename
   * @param newCollectionFilePath {string} New file path within collection e.g. subfolder/filename
   * @returns {Promise<void>}
   */
  async updateItemInOrder(oldCollectionFilePath, newCollectionFilePath) {
    const { collectionName } = this.collectionName
    const { content, sha } = await this.read()
    const index = content.collections[collectionName].order.indexOf(oldCollectionFilePath)
    content.collections[collectionName].order.splice(index, 1)
    content.collections[collectionName].order.splice(index, 0, newCollectionFilePath)
    const newContent = yaml.stringify(content)

    await this.file.update(newContent, sha)
  }

  /**
   *
   * @param subfolder {string}
   * @returns {Promise<void>}
   */
  async deleteSubfolderFromOrder(subfolder) {
    const { collectionName } = this.collectionName
    const { content, sha } = await this.read()

    const filteredOrder = content.collections[collectionName].order.filter(
      (item) => !item.includes(`${subfolder}/`)
    )
    const newContentObject = _.cloneDeep(content)
    newContentObject.collections[collectionName].order = filteredOrder
    const newContent = yaml.stringify(newContentObject)

    await this.file.update(newContent, sha)
  }

  /**
   *
   * @param subfolder {string}
   * @param newSubfolderName {string}
   * @returns {Promise<void>}
   */
  async renameSubfolderInOrder(subfolder, newSubfolderName) {
    const { collectionName } = this.collectionName
    const { content, sha } = await this.read()

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

    await this.file.update(newContent, sha)
  }
}

export default CollectionConfigService