const axios = require("axios")

const {
  ConflictError,
  inputNameConflictErrorMsg,
} = require("@errors/ConflictError")
const { NotFoundError } = require("@errors/NotFoundError")

const validateStatus = require("@utils/axios-utils")

// Import error

const { GITHUB_ORG_NAME } = process.env
const { BRANCH_REF } = process.env

class File {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.baseEndpoint = null
    this.folderPath = null
  }

  setFileType(fileType) {
    this.folderPath = fileType.getFolderName()
    this.baseEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${
      this.siteName
    }/contents${this.folderPath ? "/" : ""}${this.folderPath}`
  }

  async list() {
    const endpoint = `${this.baseEndpoint}`

    const params = {
      ref: BRANCH_REF,
    }

    const resp = await axios.get(endpoint, {
      validateStatus,
      params,
      headers: {
        Authorization: `token ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (resp.status !== 200) return {}

    const files = resp.data
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

    return files
  }

  async create(fileName, content) {
    try {
      const endpoint = `${this.baseEndpoint}/${fileName}`

      const params = {
        message: `Create file: ${fileName}`,
        content,
        branch: BRANCH_REF,
      }

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
    const endpoint = `${this.baseEndpoint}/${fileName}`

    const params = {
      ref: BRANCH_REF,
    }

    const resp = await axios.get(endpoint, {
      validateStatus,
      params,
      headers: {
        Authorization: `token ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    })
    if (resp.status === 404) throw new NotFoundError("File does not exist")

    const { content, sha } = resp.data

    return { content, sha }
  }

  async update(fileName, content, sha) {
    try {
      const endpoint = `${this.baseEndpoint}/${fileName}`

      const params = {
        message: `Update file: ${fileName}`,
        content,
        branch: BRANCH_REF,
        sha,
      }

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
      throw err
    }
  }

  async delete(fileName, sha) {
    try {
      const endpoint = `${this.baseEndpoint}/${fileName}`

      const params = {
        message: `Delete file: ${fileName}`,
        branch: BRANCH_REF,
        sha,
      }

      await axios.delete(endpoint, {
        params,
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      })
    } catch (err) {
      const { status } = err.response
      if (status === 404) throw new NotFoundError("File does not exist")
      throw err
    }
  }
}

class PageType {
  constructor() {
    this.folderName = "pages"
  }

  getFolderName() {
    return this.folderName
  }
}

class CollectionPageType {
  constructor(collectionName) {
    this.folderName = `_${collectionName}`
  }

  getFolderName() {
    return this.folderName
  }
}

class ResourcePageType {
  constructor(resourceRoomName, resourceName) {
    this.folderName = `${resourceRoomName}/${resourceName}/_posts`
  }

  getFolderName() {
    return this.folderName
  }
}

class ResourceCategoryType {
  constructor(resourceRoomName, resourceName) {
    this.folderName = `${resourceRoomName}/${resourceName}`
  }

  getFolderName() {
    return this.folderName
  }
}

class ResourceType {
  constructor(resourceRoomName) {
    this.folderName = `${resourceRoomName}`
  }

  getFolderName() {
    return this.folderName
  }
}

class ImageType {
  constructor() {
    this.folderName = "images"
  }

  getFolderName() {
    return this.folderName
  }
}

class DocumentType {
  constructor() {
    this.folderName = "files"
  }

  getFolderName() {
    return this.folderName
  }
}

class DataType {
  constructor() {
    this.folderName = "_data"
  }

  getFolderName() {
    return this.folderName
  }
}

class HomepageType {
  constructor() {
    this.folderName = ""
  }

  getFolderName() {
    return this.folderName
  }
}

module.exports = {
  File,
  PageType,
  CollectionPageType,
  ResourcePageType,
  ResourceCategoryType,
  ResourceType,
  ImageType,
  DocumentType,
  DataType,
  HomepageType,
}
