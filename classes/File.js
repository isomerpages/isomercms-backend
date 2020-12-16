const axios = require('axios');
const _ = require('lodash')
const validateStatus = require('../utils/axios-utils')

// Import error
const { NotFoundError } = require('../errors/NotFoundError')
const { ConflictError, inputNameConflictErrorMsg } = require('../errors/ConflictError')

const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME
const BRANCH_REF = process.env.BRANCH_REF

class File {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.baseEndpoint = null
    this.folderPath = null
  }

  setFileType(fileType) {
    this.folderPath = fileType.getFolderName()
    this.baseEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents${ this.folderPath ? '/' : '' }${this.folderPath}`
    this.baseBlobEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/git/blobs`
  }

  async list() {
    try {
      const endpoint = `${this.baseEndpoint}`

      const params = {
        "ref": BRANCH_REF,
      }

      const resp = await axios.get(endpoint, {
        validateStatus,
        params,
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })
  
      if (resp.status !== 200) return {}
  
      const files = resp.data.map(object => {
        const pathNameSplit = object.path.split("/")
        const fileName = pathNameSplit[pathNameSplit.length - 1]
        if (object.type === 'file') {
          return {
            path: encodeURIComponent(object.path),
            fileName,
            sha: object.sha
          }
        }
      })
  
      return _.compact(files)
    } catch (err) {
      throw err
    }
  }

  async create(fileName, content) {
    try {
      const endpoint = `${this.baseEndpoint}/${fileName}`

      const params = {
        "message": `Create file: ${fileName}`,
        "content": content,
        "branch": BRANCH_REF,
      }
  
      const resp = await axios.put(endpoint, params, {
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })

      return { sha: resp.data.content.sha }
    } catch (err) {
      const status = err.response.status
      if (status === 422 || status === 409) throw new ConflictError(inputNameConflictErrorMsg(fileName))
      throw err.response
    }
  }

  async read(fileName) {
    try {
      const files = await this.list()
      if (_.isEmpty(files)) throw new NotFoundError ('File does not exist')
      const fileToRead = files.filter((file) => file.fileName === fileName)[0]
      if (fileToRead === undefined) throw new NotFoundError ('File does not exist')
      const endpoint = `${this.baseBlobEndpoint}/${fileToRead.sha}`

      const params = {
        "ref": BRANCH_REF,
      }

      const resp = await axios.get(endpoint, {
        validateStatus,
        params,
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })

      const { content, sha } = resp.data
  
      return { content, sha }
    } catch (err) {
      throw err
    }
  }

  async update(fileName, content, sha) {
    try {
      const endpoint = `${this.baseEndpoint}/${fileName}`

      const params = {
        "message": `Update file: ${fileName}`,
        "content": content,
        "branch": BRANCH_REF,
        "sha": sha
      }
  
      const resp = await axios.put(endpoint, params, {
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })

      return { newSha: resp.data.commit.sha }
    } catch (err) {
      const status = err.response.status
      if (status === 404) throw new NotFoundError ('File does not exist')
      throw err
    }
  }

  async delete (fileName, sha) {
    try {
      const endpoint = `${this.baseEndpoint}/${fileName}`

      const params = {
        "message": `Delete file: ${fileName}`,
        "branch": BRANCH_REF,
        "sha": sha
      }
  
      await axios.delete(endpoint, {
        params,
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })
    } catch (err) {
      const status = err.response.status
      if (status === 404) throw new NotFoundError ('File does not exist')
      throw err
    }
  }
}

class PageType {
  constructor() {
    this.folderName = 'pages'
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
    this.folderName = 'images'
  }
  getFolderName() {
    return this.folderName
  }
}

class DocumentType {
  constructor() {
    this.folderName = 'files'
  }
  getFolderName() {
    return this.folderName
  }
}

class DataType {
  constructor() {
    this.folderName = '_data'
  }
  getFolderName() {
    return this.folderName
  }
}

class HomepageType {
  constructor() {
    this.folderName = ''
  }
  getFolderName() {
    return this.folderName
  }
}

module.exports = { File, PageType, CollectionPageType, ResourcePageType, ResourceCategoryType, ResourceType, ImageType, DocumentType, DataType, HomepageType }
