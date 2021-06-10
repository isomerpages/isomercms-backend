import CollectionsHandler from "./CollectionsHandler"
import CollectionConfigService from "../class-services/CollectionConfigService"
import DirectoryService from "../class-services/DirectoryService"
import FileService from "../class-services/FileService"

class SubfolderHandler {
  /**
   * @constructor
   * @param accessToken
   * @param siteName
   */
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  // TODO move to a nav handler instead since this is only called when the Navigation Bar is opened?
  /**
   *
   * @returns {Promise<*[]>}
   */
  async listAll() {
    const collectionsHandler = new CollectionsHandler(this.accessToken, this.siteName)
    const allFolders = await collectionsHandler.list()

    const allFolderContent = []

    await Bluebird.map(allFolders, async (collectionName) => {
      const config = new CollectionConfigService(this.accessToken, this.siteName, collectionName)
      const { sha, content } = await config.read()
      allFolderContent.push({ name: collectionName, sha, content })
    })

    return allFolderContent
  }

  /**
   * List all subfolders in a collection
   * @param collectionName
   * @returns {Promise<T>}
   */
  async list(collectionName) {
    const collectionDirectoryService = new DirectoryService(this.accessToken, this.siteName, `_${collectionName}`)
    const collectionContent = await collectionDirectoryService.list()

    const allSubfolders = collectionContent.reduce((acc, curr) => {
      if (curr.type === "dir") {
        const pathTokens = curr.path.split("/")
        acc.push(pathTokens.slice(1).join("/"))
      }
      return acc
    }, [])
    return allSubfolders
  }
  /**
   *
   * @param collectionName
   * @param subfolderName
   * @returns {Promise<{sha}>}
   */
  async create(collectionName, subfolderName) {
    // Update collection.yml
    const dirPath = `_${collectionName}/${subfolderName}/`
    const configService = new CollectionConfigService(this.accessToken, this.siteName, collectionName)
    await configService.addItemtoOrder(`${subfolderName}/.keep`)

    // Create placeholder file
    const keepFileService = new FileService(this.accessToken, this.siteName, dirPath, ".keep")
    return await keepFileService.create("")
  }
  /**
   *
   * @param collectionName
   * @param subfolderName
   * @param currentCommitSha
   * @param treeSha
   * @returns {Promise<void>}
   */
  async delete(collectionName, subfolderName, currentCommitSha, treeSha) {
    const dirPath = `_${collectionName}/${subfolderName}/`
    const subfolderService = new DirectoryService(this.siteName, this.accessToken, dirPath)
    await subfolderService.delete(currentCommitSha, treeSha)

    const configService = new CollectionConfigService(this.siteName, this.accessToken, collectionName)
    await configService.deleteSubfolderFromOrder(subfolderName)
  }

  async rename(collectionName, subfolderName, newSubfolderName, currentCommitSha, treeSha) {
    const dirPath = `_${collectionName}/${subfolderName}/`
    const newDirPath = `_${collectionName}/${newSubfolderName}/`
    const subfolderService = new DirectoryService(this.siteName, this.accessToken, dirPath)
    await subfolderService.update(newDirPath, currentCommitSha, treeSha)

    const configService = new CollectionConfigService(this.siteName, this.accessToken, collectionName)
    await configService.renameSubfolderInOrder(subfolderName, newSubfolderName)
  }
}

export default SubfolderHandler