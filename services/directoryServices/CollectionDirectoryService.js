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

const ListFiles = async (reqDetails, { directoryName }) =>
  CollectionYmlService.ListContents(reqDetails, {
    collectionName: directoryName,
  })

const Create = async (reqDetails, { directoryName, orderArray }) => {
  if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(directoryName))
    throw new ConflictError(protectedFolderConflictErrorMsg(directoryName))
  await CollectionYmlService.Create(reqDetails, {
    collectionName: directoryName,
    orderArray,
  })
  if (orderArray) {
    // We can't perform these operations concurrently because of conflict issues
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const file of orderArray) {
      const [fileName, oldFileDirectory, oldFileThirdNav] = file
        .split("/")
        .reverse()
      await MoverService.MovePage(reqDetails, {
        fileName,
        oldFileDirectory,
        oldFileThirdNav,
        newFileDirectory: directoryName,
      })
    }
  }
}

const Rename = async (reqDetails, { oldDirectoryName, newDirectoryName }) => {
  if (ISOMER_TEMPLATE_PROTECTED_DIRS.includes(newDirectoryName))
    throw new ConflictError(protectedFolderConflictErrorMsg(newDirectoryName))
  await BaseDirectoryService.Rename(reqDetails, {
    oldDirectoryName: `_${oldDirectoryName}`,
    newDirectoryName: `_${newDirectoryName}`,
    message: `Renaming collection ${oldDirectoryName} to ${newDirectoryName}`,
  })
  await CollectionYmlService.RenameCollectionInOrder(reqDetails, {
    oldCollectionName: oldDirectoryName,
    newCollectionName: newDirectoryName,
  })
  await NavYmlService.RenameCollectionInNav(reqDetails, {
    oldCollectionName: oldDirectoryName,
    newCollectionName: newDirectoryName,
  })
}

const Delete = async (reqDetails, { directoryName }) => {
  await BaseDirectoryService.Delete(reqDetails, {
    directoryName: `_${directoryName}`,
    message: `Deleting collection ${directoryName}`,
  })
  await NavYmlService.DeleteCollectionInNav(reqDetails, {
    collectionName: directoryName,
  })
}

module.exports = {
  ListAllCollections,
  ListFiles,
  Create,
  Rename,
  Delete,
}
