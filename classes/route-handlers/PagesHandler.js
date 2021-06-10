import CollectionConfigService from "../class-services/CollectionConfigService"
import DirectoryService from "../class-services/DirectoryService"
import FileService from "../class-services/FileService"

class PagesHandler {
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
   * @returns {Promise<{path: string, fileName: string, sha: string}[]>}
   */
  async list() {
    const rootDirService = new DirectoryService(this.accessToken, this.siteName, 'pages/')
    const rootItems = await rootDirService.list()

    const files = rootItems
      .filter((object) => {
        return object.type === "file"
      })
      .map((object) => {
        const pathNameSplit = object.path.split("/")
        const fileName = pathNameSplit[pathNameSplit.length - 1]
        return {
          path: encodeURIComponent(object.path),
          fileName,
          sha: object.sha,
        }
      })

    return files
  }

  /**
   *
   * @param fileName
   * @param content
   * @returns {Promise<void>}
   */
  async create(fileName, content) {
    const pageService = new FileService(this.accessToken, this.siteName, 'pages/', fileName)
    await pageService.create(content)
  }

  /**
   *
   * @param fileName
   * @returns {Promise<{content, sha}>}
   */
  async read(fileName) {
    const pageService = new FileService(this.accessToken, this.siteName, 'pages/', fileName)
    return await pageService.read()
  }

  /**
   *
   * @param fileName
   * @param content
   * @param sha
   * @returns {Promise<{newSha}>}
   */
  async update(fileName, content, sha) {
    const pageService = new FileService(this.accessToken, this.siteName, 'pages/', fileName)
    return await pageService.update(content, sha)
  }

  /**
   *
   * @param fileName
   * @param sha
   * @returns {Promise<void>}
   */
  async delete(fileName, sha) {
    const pageService = new FileService(this.accessToken, this.siteName, 'pages/', fileName)
    await pageService.delete(sha)
  }

  /**
   *
   * @param fileName
   * @param newFileName
   * @param content
   * @param sha
   * @returns {Promise<{sha}>}
   */
  async rename(fileName, newFileName, content, sha) {
    const newPageService = new FileService(this.accessToken, this.siteName, 'pages/', newFileName)
    const { sha: newSha } = await newPageService.create(content)

    const oldPageService = new FileService(this.accessToken, this.siteName, 'pages/', fileName)
    await oldPageService.delete(sha)

    return { sha: newSha }
  }
}

export default PagesHandler