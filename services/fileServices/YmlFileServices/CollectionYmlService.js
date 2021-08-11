const _ = require("lodash")
const yaml = require("yaml")

const COLLECTION_FILE_NAME = "collection.yml"

class CollectionYmlService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  async read(reqDetails, { collectionName }) {
    const { content: unparsedContent, sha } = await this.gitHubService.read(
      reqDetails,
      {
        fileName: COLLECTION_FILE_NAME,
        directoryName: `_${collectionName}`,
      }
    )
    const content = yaml.parse(unparsedContent)
    return { content, sha }
  }

  async update(reqDetails, { collectionName, fileContent, sha }) {
    const stringifiedContent = yaml.stringify(fileContent)
    const { newSha } = await this.gitHubService.update(reqDetails, {
      fileContent: stringifiedContent,
      sha,
      fileName: COLLECTION_FILE_NAME,
      directoryName: `_${collectionName}`,
    })
    return { newSha }
  }

  async create(reqDetails, { collectionName, orderArray }) {
    const contentObject = {
      collections: {
        [collectionName]: {
          output: true,
          order: orderArray || [],
        },
      },
    }
    const stringifiedContent = yaml.stringify(contentObject)
    return this.gitHubService.create(reqDetails, {
      content: stringifiedContent,
      fileName: COLLECTION_FILE_NAME,
      directoryName: `_${collectionName}`,
    })
  }

  async listContents(reqDetails, { collectionName }) {
    const { content } = await this.read(reqDetails, { collectionName })
    return content.collections[collectionName].order
  }

  async addItemToOrder(reqDetails, { collectionName, item, index }) {
    const { content, sha } = await this.read(reqDetails, { collectionName })

    let newIndex = index
    if (index === undefined) {
      if (item.split("/").length === 2) {
        // if file in subfolder, get index of last file in subfolder
        newIndex = _.findIndex(
          content.collections[collectionName].order,
          (f) => f.split("/")[0] === item.split("/")[0]
        )
        if (newIndex === -1) newIndex = 0
      } else {
        // get index of last file in collection
        newIndex = 0
      }
    }
    content.collections[collectionName].order.splice(newIndex, 0, item)

    return this.update(reqDetails, {
      collectionName,
      fileContent: content,
      sha,
    })
  }

  async deleteItemFromOrder(reqDetails, { collectionName, item }) {
    const { content, sha } = await this.read(reqDetails, { collectionName })

    const index = content.collections[collectionName].order.indexOf(item)
    if (index !== -1) {
      content.collections[collectionName].order.splice(index, 1)
      return this.update(reqDetails, {
        collectionName,
        fileContent: content,
        sha,
      })
    }
  }

  async updateItemInOrder(reqDetails, { collectionName, oldItem, newItem }) {
    const { content, sha } = await this.read(reqDetails, { collectionName })

    const index = content.collections[collectionName].order.indexOf(oldItem)
    content.collections[collectionName].order.splice(index, 1)
    content.collections[collectionName].order.splice(index, 0, newItem)

    return this.update(reqDetails, {
      collectionName,
      fileContent: content,
      sha,
    })
  }

  async renameCollectionInOrder(
    reqDetails,
    { oldCollectionName, newCollectionName }
  ) {
    const { content, sha } = await this.read(reqDetails, {
      collectionName: newCollectionName,
    })

    const contentObject = {
      collections: {
        [newCollectionName]: content.collections[oldCollectionName],
      },
    }

    return this.update(reqDetails, {
      collectionName: newCollectionName,
      fileContent: contentObject,
      sha,
    })
  }

  async deleteSubfolderFromOrder(reqDetails, { collectionName, subfolder }) {
    const { content, sha } = await this.read(reqDetails, { collectionName })

    const filteredOrder = content.collections[collectionName].order.filter(
      (item) => !item.includes(`${subfolder}/`)
    )
    const newContentObject = _.cloneDeep(content)
    newContentObject.collections[collectionName].order = filteredOrder

    return this.update(reqDetails, {
      collectionName,
      fileContent: newContentObject,
      sha,
    })
  }

  async renameSubfolderInOrder(
    reqDetails,
    { collectionName, oldSubfolder, newSubfolder }
  ) {
    const { content, sha } = await this.read(reqDetails, { collectionName })
    const renamedOrder = content.collections[collectionName].order.map(
      (item) => {
        if (item.includes(`${oldSubfolder}/`))
          return `${newSubfolder}/${item.split("/")[1]}`
        return item
      }
    )
    const newContentObject = _.cloneDeep(content)
    newContentObject.collections[collectionName].order = renamedOrder

    return this.update(reqDetails, {
      collectionName,
      fileContent: newContentObject,
      sha,
    })
  }

  async updateOrder(reqDetails, { collectionName, newOrder, sha }) {
    const contentObject = {
      collections: {
        [collectionName]: {
          output: true,
          order: newOrder,
        },
      },
    }
    const stringifiedContent = yaml.stringify(contentObject)
    return this.gitHubService.update(reqDetails, {
      directoryName: `_${collectionName}`,
      fileContent: stringifiedContent,
      fileName: COLLECTION_FILE_NAME,
      sha,
    })
  }
}

module.exports = { CollectionYmlService }
