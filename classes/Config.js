const axios = require('axios');
const validateStatus = require('../utils/axios-utils')
const yaml = require('js-yaml')
const base64 = require('base-64')
const _ = require('lodash')

// Import logger
const logger = require('../logger/logger');

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

  async addItemToOrder(item) {
    const collectionName = this.collectionName
    
    const { content, sha } = await this.read()
    const contentObject = yaml.safeLoad(base64.decode(content))
    
    let index
    if (item.split('/').length === 2) {
      // if file in subfolder, get index of last file in subfolder
      index = _.findLastIndex(
        contentObject.collections[collectionName].order, 
        (f) => f.split('/')[0] === item.split('/')[0]
      ) + 1
    } else {
      // get index of last file in collection
      index = contentObject.collections[collectionName].order.length
    }
    contentObject.collections[collectionName].order.splice(index, 0, item)
    const newContent = base64.encode(yaml.safeDump(contentObject))
    
    await this.update(newContent, sha)
  }

  async deleteItemFromOrder(item) {
    const collectionName = this.collectionName

    const { content, sha } = await this.read()
    const contentObject = yaml.safeLoad(base64.decode(content))
    
    const index = contentObject.collections[collectionName].order.indexOf(item);
    contentObject.collections[collectionName].order.splice(index, 1)
    const newContent = base64.encode(yaml.safeDump(contentObject))
    
    await this.update(newContent, sha)
  }
}

module.exports = { Config, CollectionConfig }