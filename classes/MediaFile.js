const axios = require("axios")

const {
  ConflictError,
  inputNameConflictErrorMsg,
} = require("@errors/ConflictError")
const { MediaTypeError } = require("@errors/MediaTypeError")
const { NotFoundError } = require("@errors/NotFoundError")

const validateStatus = require("@utils/axios-utils")
const { validateAndSanitizeFileUpload } = require("@utils/file-upload-utils")

// Import error

// Constants
const GITHUB_ORG_NAME = "isomerpages"

class ImageType {
  constructor(directory) {
    this.folderName = directory || "images"
  }

  getFolderName() {
    return this.folderName
  }
}

class DocumentType {
  constructor(directory) {
    this.folderName = directory || "files"
  }

  getFolderName() {
    return this.folderName
  }
}

class MediaFile {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.baseEndpoint = null
    this.fileType = null
  }

  setFileTypeToImage(directory) {
    this.fileType = new ImageType(directory)
    this.baseEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${
      this.siteName
    }/contents/${this.fileType.getFolderName()}`
    // Endpoint to retrieve files greater than 1MB
    this.baseBlobEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/git/blobs`
  }

  setFileTypeToDocument(directory) {
    this.fileType = new DocumentType(directory)
    this.baseEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${
      this.siteName
    }/contents/${this.fileType.getFolderName()}`
    // Endpoint to retrieve files greater than 1MB
    this.baseBlobEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/git/blobs`
  }

  async list() {
    const endpoint = `${this.baseEndpoint}`

    const resp = await axios.get(endpoint, {
      validateStatus,
      headers: {
        Authorization: `token ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (resp.status !== 200) return {}

    return resp.data
      .filter((object) => object.type === "file")
      .map((object) => {
        const pathNameSplit = object.path.split("/")
        const fileName = pathNameSplit[pathNameSplit.length - 1]
        return {
          path: encodeURIComponent(object.path),
          fileName,
          sha: object.sha,
        }
      })
  }

  async create(fileName, content) {
    const sanitizedContent = await validateAndSanitizeFileUpload(content)
    if (!sanitizedContent) {
      throw new MediaTypeError(`File extension is not within the approved list`)
    }

    const endpoint = `${this.baseEndpoint}/${fileName}`

    const params = {
      message: `Create file: ${fileName}`,
      content: sanitizedContent,
      branch: "staging",
    }

    try {
      const resp = await axios.put(endpoint, params, {
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      return { sha: resp.data.content.sha }
    } catch (err) {
      const { status } = err.response
      if (status === 422 || status === 409)
        throw new ConflictError(inputNameConflictErrorMsg(fileName))
      throw err.response
    }
  }

  async read(fileName) {
    /**
     * Images that are bigger than 1 MB needs to be retrieved
     * via Github Blob API. The content can only be retrieved through
     * the `sha` of the file.
     * The code below takes the `fileName`,
     * lists all the files in the image directory
     * and filters it down to get the sha of the file
     */
    const images = await this.list()
    const imageSha = images.filter((image) => image.fileName === fileName)[0]
      .sha

    const blobEndpoint = `${this.baseBlobEndpoint}/${imageSha}`

    const resp = await axios.get(blobEndpoint, {
      validateStatus,
      headers: {
        Authorization: `token ${this.accessToken}`,
      },
    })

    if (resp.status === 404) throw new NotFoundError("Image does not exist")

    const { content, sha } = resp.data

    return { content, sha }
  }

  async update(fileName, content, sha) {
    const endpoint = `${this.baseEndpoint}/${fileName}`

    const params = {
      message: `Update file: ${fileName}`,
      content,
      branch: "staging",
      sha,
    }

    try {
      const resp = await axios.put(endpoint, params, {
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      return { newSha: resp.data.commit.sha }
    } catch (err) {
      const { status } = err.response
      if (status === 404) throw new NotFoundError("File does not exist")
      if (status === 409)
        throw new ConflictError(
          "File has been changed recently, please try again"
        )
      throw err
    }
  }

  async delete(fileName, sha) {
    const endpoint = `${this.baseEndpoint}/${fileName}`

    const params = {
      message: `Delete file: ${fileName}`,
      branch: "staging",
      sha,
    }

    try {
      await axios.delete(endpoint, {
        data: params,
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      })
    } catch (err) {
      const { status } = err.response
      if (status === 404) throw new NotFoundError("File does not exist")
      if (status === 409)
        throw new ConflictError(
          "File has been changed recently, please try again"
        )
      throw err
    }
  }
}

module.exports = { MediaFile }
