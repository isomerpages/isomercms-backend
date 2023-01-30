const _ = require("lodash")

const {
  sanitizedYamlParse,
  sanitizedYamlStringify,
} = require("@utils/yaml-utils")

const COLLECTION_FILE_NAME = "collection.yml"

class CollectionYmlService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  async read(sessionData, { collectionName }) {
    const { content: unparsedContent, sha } = await this.gitHubService.read(
      sessionData,
      {
        fileName: COLLECTION_FILE_NAME,
        directoryName: `_${collectionName}`,
      }
    )
    const content = sanitizedYamlParse(unparsedContent)
    return { content, sha }
  }

  async update(sessionData, { collectionName, fileContent, sha }) {
    const stringifiedContent = sanitizedYamlStringify(fileContent)
    const { newSha } = await this.gitHubService.update(sessionData, {
      fileContent: stringifiedContent,
      sha,
      fileName: COLLECTION_FILE_NAME,
      directoryName: `_${collectionName}`,
    })
    return { newSha }
  }

  async create(sessionData, { collectionName, orderArray }) {
    const contentObject = {
      collections: {
        [collectionName]: {
          output: true,
          order: orderArray || [],
        },
      },
    }
    const stringifiedContent = sanitizedYamlStringify(contentObject)
    return this.gitHubService.create(sessionData, {
      content: stringifiedContent,
      fileName: COLLECTION_FILE_NAME,
      directoryName: `_${collectionName}`,
    })
  }

  async listContents(sessionData, { collectionName }) {
    const { content } = await this.read(sessionData, { collectionName })
    return content.collections[collectionName].order
  }

  async addItemToOrder(sessionData, { collectionName, item, index }) {
    const { content, sha } = await this.read(sessionData, { collectionName })

    let newIndex = index
    if (index === undefined) {
      if (item.split("/").length === 2) {
        // if file in subcollection, get index of first file in subcollection
        newIndex = _.findIndex(
          content.collections[collectionName].order,
          (f) => f.split("/")[0] === item.split("/")[0]
        )
        if (newIndex === -1) newIndex = 0
      } else {
        // get index of first file in collection
        newIndex = 0
      }
    }
    content.collections[collectionName].order.splice(newIndex, 0, item)

    return this.update(sessionData, {
      collectionName,
      fileContent: content,
      sha,
    })
  }

  async deleteItemFromOrder(sessionData, { collectionName, item }) {
    const { content, sha } = await this.read(sessionData, { collectionName })

    const index = content.collections[collectionName].order.indexOf(item)
    if (index !== -1) {
      content.collections[collectionName].order.splice(index, 1)
      return this.update(sessionData, {
        collectionName,
        fileContent: content,
        sha,
      })
    }
  }

  async updateItemInOrder(sessionData, { collectionName, oldItem, newItem }) {
    const { content, sha } = await this.read(sessionData, { collectionName })

    const index = content.collections[collectionName].order.indexOf(oldItem)
    content.collections[collectionName].order.splice(index, 1)
    content.collections[collectionName].order.splice(index, 0, newItem)

    return this.update(sessionData, {
      collectionName,
      fileContent: content,
      sha,
    })
  }

  async renameCollectionInOrder(
    sessionData,
    { oldCollectionName, newCollectionName }
  ) {
    const { content, sha } = await this.read(sessionData, {
      collectionName: newCollectionName,
    })

    const contentObject = {
      collections: {
        [newCollectionName]: content.collections[oldCollectionName],
      },
    }

    return this.update(sessionData, {
      collectionName: newCollectionName,
      fileContent: contentObject,
      sha,
    })
  }

  async deleteSubfolderFromOrder(sessionData, { collectionName, subfolder }) {
    const { content, sha } = await this.read(sessionData, { collectionName })

    const filteredOrder = content.collections[collectionName].order.filter(
      (item) => !item.includes(`${subfolder}/`)
    )
    const newContentObject = _.cloneDeep(content)
    newContentObject.collections[collectionName].order = filteredOrder

    return this.update(sessionData, {
      collectionName,
      fileContent: newContentObject,
      sha,
    })
  }

  async renameSubfolderInOrder(
    sessionData,
    { collectionName, oldSubfolder, newSubfolder }
  ) {
    const { content, sha } = await this.read(sessionData, { collectionName })
    const renamedOrder = content.collections[collectionName].order.map(
      (item) => {
        if (item.includes(`${oldSubfolder}/`))
          return `${newSubfolder}/${item.split("/")[1]}`
        return item
      }
    )
    const newContentObject = _.cloneDeep(content)
    newContentObject.collections[collectionName].order = renamedOrder

    return this.update(sessionData, {
      collectionName,
      fileContent: newContentObject,
      sha,
    })
  }

  async updateOrder(sessionData, { collectionName, newOrder }) {
    const { sha } = await this.read(sessionData, { collectionName })
    const contentObject = {
      collections: {
        [collectionName]: {
          output: true,
          order: newOrder,
        },
      },
    }
    const stringifiedContent = sanitizedYamlStringify(contentObject)
    return this.gitHubService.update(sessionData, {
      directoryName: `_${collectionName}`,
      fileContent: stringifiedContent,
      fileName: COLLECTION_FILE_NAME,
      sha,
    })
  }
}

module.exports = { CollectionYmlService }
