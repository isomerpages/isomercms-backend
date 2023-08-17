import { config } from "@config/config"

const { Base64 } = require("js-base64")
const _ = require("lodash")

const {
  ConflictError,
  inputNameConflictErrorMsg,
} = require("@errors/ConflictError")
const { NotFoundError } = require("@errors/NotFoundError")

const { validateStatus } = require("@utils/axios-utils")
const {
  sanitizedYamlParse,
  sanitizedYamlStringify,
} = require("@utils/yaml-utils")

const {
  genericGitHubAxiosInstance: axios,
} = require("@root/services/api/AxiosInstance")

// Import error

const GITHUB_ORG_NAME = config.get("github.orgName")
const BRANCH_REF = config.get("github.branchRef")

class Config {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
    this.endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/_config.yml`
  }

  async read() {
    const params = {
      ref: BRANCH_REF,
    }

    const resp = await axios.get(this.endpoint, {
      validateStatus,
      params,
      headers: {
        Authorization: `token ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (resp.status === 404)
      throw new NotFoundError("Config page does not exist")

    const { content, sha } = resp.data

    return { content, sha }
  }

  async update(newContent, sha) {
    const params = {
      message: "Edit config",
      content: newContent,
      branch: BRANCH_REF,
      sha,
    }

    await axios.put(this.endpoint, params, {
      headers: {
        Authorization: `token ${this.accessToken}`,
        "Content-Type": "application/json",
      },
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
        message: `Create file: _${this.collectionName}/collection.yml`,
        content,
        branch: BRANCH_REF,
      }

      const resp = await axios.put(this.endpoint, params, {
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      return { sha: resp.data.content.sha }
    } catch (err) {
      const { status } = err.response
      if (status === 422 || status === 409)
        throw new ConflictError(
          inputNameConflictErrorMsg(`${this.collectionName}/collection.yml`)
        )
      throw err.response
    }
  }

  async delete(sha) {
    try {
      const params = {
        message: `Delete file: _${this.collectionName}/collection.yml`,
        branch: BRANCH_REF,
        sha,
      }

      await axios.delete(this.endpoint, {
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

  async read() {
    const { content, sha } = await super.read()
    const contentObject = sanitizedYamlParse(Base64.decode(content))
    return { content: contentObject, sha }
  }

  async addItemToOrder(item, index) {
    const { collectionName } = this
    const { content, sha } = await this.read()

    let newIndex = index
    if (index === undefined) {
      if (item.split("/").length === 2) {
        // if file in subfolder, get index of last file in subfolder
        newIndex =
          _.findLastIndex(
            content.collections[collectionName].order,
            (f) => f.split("/")[0] === item.split("/")[0]
          ) + 1
      } else {
        // get index of last file in collection
        newIndex = content.collections[collectionName].order.length
      }
    }
    content.collections[collectionName].order.splice(newIndex, 0, item)
    const newContent = Base64.encode(sanitizedYamlStringify(content))

    await this.update(newContent, sha)
  }

  async deleteItemFromOrder(item) {
    const { collectionName } = this
    const { content, sha } = await this.read()
    const index = content.collections[collectionName].order.indexOf(item)
    content.collections[collectionName].order.splice(index, 1)
    const newContent = Base64.encode(sanitizedYamlStringify(content))

    await this.update(newContent, sha)
    return { index, item }
  }

  async updateItemInOrder(oldItem, newItem) {
    const { collectionName } = this
    const { content, sha } = await this.read()
    const index = content.collections[collectionName].order.indexOf(oldItem)
    content.collections[collectionName].order.splice(index, 1)
    content.collections[collectionName].order.splice(index, 0, newItem)
    const newContent = Base64.encode(sanitizedYamlStringify(content))

    await this.update(newContent, sha)
  }

  async deleteSubfolderFromOrder(subfolder) {
    const { collectionName } = this
    const { content, sha } = await this.read()
    const filteredOrder = content.collections[collectionName].order.filter(
      (item) => !item.includes(`${subfolder}/`)
    )
    const newContentObject = _.cloneDeep(content)
    newContentObject.collections[collectionName].order = filteredOrder
    const newContent = Base64.encode(sanitizedYamlStringify(newContentObject))

    await this.update(newContent, sha)
  }

  async renameSubfolderInOrder(subfolder, newSubfolderName) {
    const { collectionName } = this
    const { content, sha } = await this.read()
    const renamedOrder = content.collections[collectionName].order.map(
      (item) => {
        if (item.includes(`${subfolder}/`))
          return `${newSubfolderName}/${item.split("/")[1]}`
        return item
      }
    )
    const newContentObject = _.cloneDeep(content)
    newContentObject.collections[collectionName].order = renamedOrder
    const newContent = Base64.encode(sanitizedYamlStringify(newContentObject))

    await this.update(newContent, sha)
  }
}

module.exports = { Config, CollectionConfig }
