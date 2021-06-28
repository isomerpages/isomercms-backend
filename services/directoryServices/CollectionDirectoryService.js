const {
  ConflictError,
  protectedFolderConflictErrorMsg,
} = require("@errors/ConflictError")

const MoverService = require("@services/MoverService")

const CollectionYmlService = require("../fileServices/YmlFileServices/CollectionYmlService")
const NavYmlService = require("../fileServices/YmlFileServices/NavYmlService")

const BaseDirectoryService = require("./BaseDirectoryService")

const ISOMER_TEMPLATE_DIRS = ["_data", "_includes", "_site", "_layouts"]
const ISOMER_TEMPLATE_PROTECTED_DIRS = [
  "data",
  "includes",
  "site",
  "layouts",
  "files",
  "images",
  "misc",
  "pages",
]

const ListAllCollections = async (reqDetails) => {
  const filesOrDirs = await BaseDirectoryService.List(reqDetails, {
    directoryName: "",
  })
  return filesOrDirs.reduce((acc, curr) => {
    if (
      curr.type === "dir" &&
      !ISOMER_TEMPLATE_DIRS.includes(curr.name) &&
      curr.name.slice(0, 1) === "_"
    )
      acc.push(curr.path.slice(1))
    return acc
  }, [])
}

const ListFiles = async (reqDetails, { collectionName }) =>
  CollectionYmlService.ListContents(reqDetails, {
    collectionName,
  })

const Create = async (reqDetails, { collectionName, orderArray }) => {
  if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(collectionName))
    throw new ConflictError(protectedFolderConflictErrorMsg(collectionName))
  await CollectionYmlService.Create(reqDetails, {
    collectionName,
  })
  if (orderArray) {
    // We can't perform these operations concurrently because of conflict issues
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const file of orderArray) {
      const [fileName, oldFileCollection, oldFileThirdNav] = file
        .split("/")
        .reverse()
      await MoverService.MovePage(reqDetails, {
        fileName,
        oldFileCollection,
        oldFileThirdNav,
        newFileCollection: collectionName,
      })
    }
  }
}

const Rename = async (reqDetails, { oldCollectionName, newCollectionName }) => {
  if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(newCollectionName))
    throw new ConflictError(protectedFolderConflictErrorMsg(newCollectionName))
  await BaseDirectoryService.Rename(reqDetails, {
    oldDirectoryName: `_${oldCollectionName}`,
    newDirectoryName: `_${newCollectionName}`,
    message: `Renaming collection ${oldCollectionName} to ${newCollectionName}`,
  })
  await CollectionYmlService.RenameCollectionInOrder(reqDetails, {
    oldCollectionName,
    newCollectionName,
  })
  await NavYmlService.RenameCollectionInNav(reqDetails, {
    oldCollectionName,
    newCollectionName,
  })
}

const Delete = async (reqDetails, { collectionName }) => {
  await BaseDirectoryService.Delete(reqDetails, {
    directoryName: `_${collectionName}`,
    message: `Deleting collection ${collectionName}`,
  })
  await NavYmlService.DeleteCollectionInNav(reqDetails, {
    collectionName,
  })
}

module.exports = {
  ListAllCollections,
  ListFiles,
  Create,
  Rename,
  Delete,
}
