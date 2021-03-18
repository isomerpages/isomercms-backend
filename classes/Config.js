const axios = require('axios');
const validateStatus = require('../utils/axios-utils')
const yaml = require('js-yaml')
const base64 = require('base-64')
const _ = require('lodash')

// Import error
const { NotFoundError } = require('../errors/NotFoundError')
const { ConflictError, inputNameConflictErrorMsg } = require('../errors/ConflictError')

const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME
const BRANCH_REF = process.env.BRANCH_REF

class Config {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/_config.yml`
  }

  async read() {
    try {
    const params = {
      "ref": BRANCH_REF,
    }
      
      const resp = await axios.get(this.endpoint, {
      validateStatus,
      params,
      headers: {
        Authorization: `token ${this.accessToken}`,
        "Content-Type": "application/json"
      }
      })

      if (resp.status === 404) throw new NotFoundError ('Config page does not exist')

      const { content, sha } = resp.data

      return { content, sha }

    } catch (err) {
      throw err
    }
  }

  async update(newContent, sha) {
    const params = {
      "message": 'Edit config',
      "content": newContent,
      "branch": BRANCH_REF,
      "sha": sha
    }

    await axios.put(this.endpoint, params, {
      headers: {
        Authorization: `token ${this.accessToken}`,
        "Content-Type": "application/json"
      }
    })
  }
}

class CollectionConfig extends Config {
  constructor(accessToken, siteName, collectionName) {
    super(accessToken, siteName)
    this.collectionName = collectionName
    this.endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/_${collectionName}/collection.yml`
  }

  async create(content) {
    try {
      const params = {
        "message": `Create file: _${this.collectionName}/collection.yml`,
        "content": content,
        "branch": BRANCH_REF,	
      }
      
      const resp = await axios.put(this.endpoint, params, {
          headers: {
          Authorization: `token ${this.accessToken}`,
        "Content-Type": "application/json"
        }
      })
    
      return { sha: resp.data.content.sha }
    } catch (err) {
      const { status } = err.response
      if (status === 422 || status === 409) throw new ConflictError(inputNameConflictErrorMsg(fileName))
      throw err.response
    }
  }
  
  async delete (sha) {
    try {
      const params = {
        "message": `Delete file: _${this.collectionName}/collection.yml`,
        "branch": BRANCH_REF,
        "sha": sha
      }
  
      await axios.delete(this.endpoint, {
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

  async read() {
    const { content, sha } = await super.read()
    const contentObject = yaml.safeLoad(base64.decode(content))
    return { content: contentObject, sha }
  }

  async addItemToOrder(item, index) {
    const collectionName = this.collectionName
    const { content, sha } = await this.read()

    if (index === undefined) {
      let index
      if (item.split('/').length === 2) {
        // if file in subfolder, get index of last file in subfolder
        index = _.findLastIndex(
          content.collections[collectionName].order,
          (f) => f.split('/')[0] === item.split('/')[0]
        ) + 1
      } else {
        // get index of last file in collection
        index = content.collections[collectionName].order.length
      }
    }
    content.collections[collectionName].order.splice(index, 0, item)
    const newContent = base64.encode(yaml.safeDump(content))
    
    await this.update(newContent, sha)
  }

  async deleteItemFromOrder(item) {
    const collectionName = this.collectionName
    const { content, sha } = await this.read()
    const index = content.collections[collectionName].order.indexOf(item)
    content.collections[collectionName].order.splice(index, 1)
    const newContent = base64.encode(yaml.safeDump(content))
    
    await this.update(newContent, sha)
    return { index, item }
  }

  async updateItemInOrder(oldItem, newItem) {
    const collectionName = this.collectionName
    const { content, sha } = await this.read()
    const index = content.collections[collectionName].order.indexOf(oldItem)
    content.collections[collectionName].order.splice(index, 1)
    content.collections[collectionName].order.splice(index, 0, newItem)
    const newContent = base64.encode(yaml.safeDump(content))
    
    await this.update(newContent, sha)
  }

  async deleteSubfolderFromOrder(subfolder) {
    const collectionName = this.collectionName
    const { contentObject, sha } = await this.read()
    const filteredOrder = contentObject.collections[collectionName].order.filter(item => !item.includes(`${subfolder}/`))
    const newContentObject = _.cloneDeep(contentObject)
    newContentObject.collections[collectionName].order = filteredOrder
    const newContent = base64.encode(yaml.safeDump(newContentObject))

    await this.update(newContent, sha)
  }

  async renameSubfolderInOrder(subfolder, newSubfolderName) {
    const collectionName = this.collectionName
    const { contentObject, sha } = await this.read()
    const renamedOrder = contentObject.collections[collectionName].order.map(item => {
      if (item.includes(`${subfolder}/`)) return `${newSubfolderName}/${item.split('/')[1]}`
      return item
    })
    const newContentObject = _.cloneDeep(contentObject)
    newContentObject.collections[collectionName].order = renamedOrder
    const newContent = base64.encode(yaml.safeDump(newContentObject))

    await this.update(newContent, sha)
  }
}

module.exports = { Config, CollectionConfig }