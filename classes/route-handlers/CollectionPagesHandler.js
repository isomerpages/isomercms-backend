import FileService from "../class-services/FileService"
import CollectionConfigService from "../class-services/CollectionConfigService"

class CollectionPagesHandler {
  /**
   * @constructor
   * @param accessToken
   * @param siteName
   */
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  /**
   *
   * @param collectionName
   * @param collectionFilePath
   * @param content
   * @returns {Promise<void>}
   */
  async create(collectionName, collectionFilePath, content) {
    const collectionFilePathArr = collectionFilePath.split('/')
    const fileName = collectionFilePathArr.pop()
    const dirPath = `_${collectionName}/${collectionFilePathArr.length > 0 ? collectionFilePathArr.join('/') + '/' : ''}`

    const collectionPageService = new FileService(this.accessToken, this.siteName, dirPath, fileName)
    await collectionPageService.create(content)

    const configService = new CollectionConfigService(this.accessToken, this.siteName, collectionName)
    await configService.addItemtoOrder(collectionFilePath)
  }

  /**
   *
   * @param collectionName
   * @param collectionFilePath
   * @returns {Promise<{content, sha}>}
   */
  async read(collectionName, collectionFilePath) {
    const collectionFilePathArr = collectionFilePath.split('/')
    const fileName = collectionFilePathArr.pop()
    const dirPath = `_${collectionName}/${collectionFilePathArr.length > 0 ? collectionFilePathArr.join('/') + '/' : ''}`

    const collectionPageService = new FileService(this.accessToken, this.siteName, dirPath, fileName)
    return await collectionPageService.read()
  }

  /**
   *
   * @param collectionName
   * @param collectionFilePath
   * @param content
   * @param sha
   * @returns {Promise<{newSha}>}
   */
  async update(collectionName, collectionFilePath, content, sha) {
    const collectionFilePathArr = collectionFilePath.split('/')
    const fileName = collectionFilePathArr.pop()
    const dirPath = `_${collectionName}/${collectionFilePathArr.length > 0 ? collectionFilePathArr.join('/') + '/' : ''}`

    const collectionPageService = new FileService(this.accessToken, this.siteName, dirPath, fileName)
    return await collectionPageService.update(content, sha)
  }

  /**
   *
   * @param collectionName
   * @param collectionFilePath
   * @param sha
   * @returns {Promise<void>}
   */
  async delete(collectionName, collectionFilePath, sha) {
    const collectionFilePathArr = collectionFilePath.split('/')
    const fileName = collectionFilePathArr.pop()
    const dirPath = `_${collectionName}/${collectionFilePathArr.length > 0 ? collectionFilePathArr.join('/') + '/' : ''}`

    const collectionPageService = new FileService(this.accessToken, this.siteName, dirPath, fileName)
    await collectionPageService.delete(sha)

    const configService = new CollectionConfigService(this.accessToken, this.siteName, collectionName)
    await configService.deleteItemFromOrder(collectionFilePath)
  }

  /**
   *
   * @param collectionName
   * @param oldCollectionFilePath
   * @param newCollectionFilePath
   * @param content
   * @param sha
   * @returns {Promise<{newSha}>}
   */
  async rename(collectionName, oldCollectionFilePath, newCollectionFilePath, content, sha) {
    const oldCollectionFilePathArr = oldCollectionFilePath.split('/')
    const oldFileName = oldCollectionFilePathArr.pop()
    const oldDirPath = `_${collectionName}/${oldCollectionFilePathArr.length > 0 ? oldCollectionFilePathArr.join('/') + '/' : ''}`

    const newCollectionFilePathArr = newCollectionFilePath.split('/')
    const newFileName = newCollectionFilePathArr.pop()
    const newDirPath = `_${collectionName}/${newCollectionFilePathArr.length > 0 ? newCollectionFilePathArr.join('/') + '/' : ''}`

    const newCollectionPageService = new FileService(this.accessToken, this.siteName, newDirPath, newFileName)
    const { sha: newSha } = await newCollectionPageService.create(content)
    const oldCollectionPageService = new FileService(this.accessToken, this.siteName, oldDirPath, oldFileName)
    await oldCollectionPageService.delete(sha)

    const configService = new CollectionConfigService(this.accessToken, this.siteName, collectionName)
    await configService.updateItemInOrder(oldCollectionFilePath, newCollectionFilePath)

    return { newSha }
  }
}

export default CollectionPagesHandler