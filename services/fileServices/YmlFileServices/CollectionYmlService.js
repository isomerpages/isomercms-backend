const _ = require("lodash")
const yaml = require("yaml")

const GitHubService = require("@services/db/GitHubService")

const COLLECTION_FILE_NAME = "collection.yml"

const Read = async (reqDetails, { collectionName }) => {
  const { content: unparsedContent, sha } = await GitHubService.Read(
    reqDetails,
    { fileName: COLLECTION_FILE_NAME, dir: `_${collectionName}` }
  )
  const content = yaml.parse(unparsedContent)
  return { content, sha }
}

const Update = async (reqDetails, { collectionName, fileContent, sha }) => {
  const stringifiedContent = yaml.stringify(fileContent)
  const { newSha } = await GitHubService.Update(reqDetails, {
    fileContent: stringifiedContent,
    sha,
    fileName: COLLECTION_FILE_NAME,
    dir: `_${collectionName}`,
  })
  return { newSha }
}

const Create = async (reqDetails, { collectionName, orderArray }) => {
  const contentObject = {
    collections: {
      [collectionName]: {
        output: true,
        order: orderArray || [],
      },
    },
  }
  const stringifiedContent = yaml.stringify(contentObject)
  return GitHubService.Create(reqDetails, {
    content: stringifiedContent,
    fileName: COLLECTION_FILE_NAME,
    dir: `_${collectionName}`,
  })
}

const ListContents = async (reqDetails, { collectionName }) => {
  const fileDir = `_${collectionName}`
  const { content } = await Read(reqDetails, { collectionName })
  return content.collections[fileDir].order
}

const AddItemToOrder = async (reqDetails, { collectionName, item, index }) => {
  const { content, sha } = await Read(reqDetails, { collectionName })

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

  return Update(reqDetails, { collectionName, fileContent: content, sha })
}

const DeleteItemFromOrder = async (reqDetails, { collectionName, item }) => {
  const { content, sha } = await Read(reqDetails, { collectionName })

  const index = content.collections[collectionName].order.indexOf(item)
  content.collections[collectionName].order.splice(index, 1)

  return Update(reqDetails, { collectionName, fileContent: content, sha })
}

const UpdateItemInOrder = async (
  reqDetails,
  { collectionName, oldItem, newItem }
) => {
  const { content, sha } = await Read(reqDetails, { collectionName })

  const index = content.collections[collectionName].order.indexOf(oldItem)
  content.collections[collectionName].order.splice(index, 1)
  content.collections[collectionName].order.splice(index, 0, newItem)

  return Update(reqDetails, { collectionName, fileContent: content, sha })
}

const RenameCollectionInOrder = async (
  reqDetails,
  { oldCollectionName, newCollectionName }
) => {
  const { content, sha } = await Read(reqDetails, {
    collectionName: newCollectionName,
  })

  const contentObject = {
    collections: {
      [newCollectionName]: content.collections[oldCollectionName],
    },
  }

  return Update(reqDetails, {
    collectionName: newCollectionName,
    fileContent: contentObject,
    sha,
  })
}

const DeleteSubfolderFromOrder = async (
  reqDetails,
  { collectionName, subfolder }
) => {
  const { content, sha } = await Read(reqDetails, { collectionName })

  const filteredOrder = content.collections[collectionName].order.filter(
    (item) => !item.includes(`${subfolder}/`)
  )
  const newContentObject = _.cloneDeep(content)
  newContentObject.collections[collectionName].order = filteredOrder

  return Update(reqDetails, {
    collectionName,
    fileContent: newContentObject,
    sha,
  })
}

const RenameSubfolderInOrder = async (
  reqDetails,
  { collectionName, oldSubfolder, newSubfolder }
) => {
  const { content, sha } = await Read(reqDetails, { collectionName })
  const renamedOrder = content.collections[collectionName].order.map((item) => {
    if (item.includes(`${oldSubfolder}/`))
      return `${newSubfolder}/${item.split("/")[1]}`
    return item
  })
  const newContentObject = _.cloneDeep(content)
  newContentObject.collections[collectionName].order = renamedOrder

  return Update(reqDetails, {
    collectionName,
    fileContent: newContentObject,
    sha,
  })
}

const UpdateOrder = async (reqDetails, { collectionName, newOrder, sha }) => {
  const contentObject = {
    collections: {
      [collectionName]: {
        output: true,
        order: newOrder,
      },
    },
  }
  const stringifiedContent = yaml.stringify(contentObject)
  return GitHubService.Update(reqDetails, {
    collectionName,
    fileContent: stringifiedContent,
    sha,
  })
}

module.exports = {
  Read,
  Update,
  Create,
  ListContents,
  AddItemToOrder,
  DeleteItemFromOrder,
  UpdateItemInOrder,
  RenameCollectionInOrder,
  DeleteSubfolderFromOrder,
  RenameSubfolderInOrder,
  UpdateOrder,
}
