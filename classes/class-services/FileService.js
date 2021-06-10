import GitHubService from "./GitHubService"

const {
  ConflictError,
  inputNameConflictErrorMsg,
} = require("@errors/ConflictError")
const { NotFoundError } = require("@errors/NotFoundError")

class FileService {
  /**
   * Represents an specific file within the repo
   * @constructor
   * @param accessToken {string}
   * @param siteName {string}
   * @param dirPath {string} Path of the file from the root of the repo e.g. 'folder/subfolder/'
   * @param fileName {string} Name of the file including extension
   */
  constructor(accessToken, siteName, dirPath, fileName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.dirPath = dirPath
    this.fileName = fileName
  }

  /**
   * Create file within specified directory
   * @param content {string} Raw unencoded file content
   * @returns {Promise<{sha}>}
   */
  async create(content) {
    try {
      const filePath = `${this.dirPath}${this.fileName}`
      const encodedContent = Base64.encode(content)
      const resp = await GitHubService.create(this.accessToken, this.siteName, filePath, encodedContent)

      return { sha: resp.data.content.sha }
    } catch (err) {
      const { status } = err.response
      if (status === 422 || status === 409)
        throw new ConflictError(inputNameConflictErrorMsg(`${this.dirPath}${this.fileName}`))
      throw err.response
    }
  }

  /**
   * Reads and returns decoded contents and sha of specified file
   * @returns {Promise<{content, sha}>}
   */
  async read() {
    const filePath = `${this.dirPath}${this.fileName}`
    const resp = await GitHubService.read(this.accessToken, this.siteName, filePath)

    if (resp.status === 404) throw new NotFoundError("File does not exist")

    const { content, sha } = resp.data
    const decodedContent = Base64.decode(content)
    return { content: decodedContent, sha }
  }

  /**
   * Update content of file
   * @param content {string} Raw unencoded new file content
   * @param sha {string}
   * @returns {Promise<{newSha}>}
   */
  async update(content, sha) {
    try {
      const filePath = `${this.dirPath}${this.fileName}`
      const encodedContent = Base64.encode(content)

      const resp = await GitHubService.update(this.accessToken, this.siteName, filePath, encodedContent, sha)
      return { newSha: resp.data.commit.sha }
    } catch (err) {
      const { status } = err.response
      if (status === 404) throw new NotFoundError("File does not exist")
      throw err
    }
  }

  /**
   *
   * @param sha {string}
   * @returns {Promise<void>}
   */
  async delete(sha) {
    try {
      const filePath = `${this.dirPath}${this.fileName}`

      await GitHubService.delete(this.accessToken, this.siteName, filePath, sha)

    } catch (err) {
      const { status } = err.response
      if (status === 404) throw new NotFoundError("File does not exist")
      throw err
    }
  }
}

export default FileService