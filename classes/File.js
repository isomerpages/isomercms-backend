const axios = require('axios');
const _ = require('lodash')

const GITHUB_ORG_NAME = 'isomerpages'

// validateStatus allows axios to handle a 404 HTTP status without rejecting the promise.
// This is necessary because GitHub returns a 404 status when the file does not exist.
const validateStatus = (status) => {
  return (status >= 200 && status < 300) || status === 404
}

class File {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.baseEndpoint = null
  }

  setFileType(fileType) {
    const folderPath = fileType.getFolderName()
    this.baseEndpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/${folderPath}`
  }

  async list() {
    try {
      const endpoint = `${this.baseEndpoint}`

      const resp = await axios.get(endpoint, {
        validateStatus: validateStatus,
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })
  
      if (resp.status !== 200) throw new Error ('The pages folder cannot be found.')
  
      const files = resp.data.map(object => {
        const pathNameSplit = object.path.split("/")
        const fileName = pathNameSplit[pathNameSplit.length - 1]
        if (object.type === 'file') {
          return {
            path: encodeURIComponent(object.path),
            fileName
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

      let params = {
        "message": `Create file: ${fileName}`,
        "content": content,
        "branch": "staging",
      }
  
      await axios.put(endpoint, params, {
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })
    } catch (err) {
      throw err
    }
  }

  async read(fileName) {
    try {
      const endpoint = `${this.baseEndpoint}/${fileName}`

      const resp = await axios.get(endpoint, {
        validateStatus: validateStatus,
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })
  
      if (resp.status === 404) throw new Error ('Page does not exist')
  
      const { content, sha } = resp.data
  
      return { content, sha }
    } catch (err) {
      throw err
    }
  }

  async update(fileName, content, sha) {
    try {
      const endpoint = `${this.baseEndpoint}/${fileName}`

      let params = {
        "message": `Update file: ${fileName}`,
        "content": content,
        "branch": "staging",
        "sha": sha
      }
  
      await axios.put(endpoint, params, {
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })
    } catch (err) {
      throw err
    }
  }

  async delete (fileName, sha) {
    try {
      const endpoint = `${this.baseEndpoint}/${fileName}`

      let params = {
        "message": `Delete file: ${fileName}`,
        "branch": "staging",
        "sha": sha
      }
  
      await axios.delete(endpoint, {
        data: params,
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })
    } catch (err) {
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
  constructor(resourceName) {
    this.folderName = `_${resourceName}`
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

module.exports = { File, PageType, CollectionPageType, ResourcePageType, ImageType, DocumentType, DataType }
