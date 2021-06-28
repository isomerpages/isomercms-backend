const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")
const { deslugifyCollectionName } = require("@utils/utils.js")

const GitHubService = require("@services/db/GitHubService")
const CollectionYmlService = require("@services/fileServices/YmlFileServices/CollectionYmlService")
const MoverService = require("@services/MoverService")

const BaseDirectoryService = require("./BaseDirectoryService")

const PLACEHOLDER_FILE_NAME = ".keep"

const ListFiles = async (reqDetails, { collectionName, thirdNavTitle }) => {
  const files = await BaseDirectoryService.List(reqDetails, {
    directoryName: `_${collectionName}/${thirdNavTitle}`,
  })
  return files.filter((file) => file.name !== PLACEHOLDER_FILE_NAME)
}

const Create = async (
  reqDetails,
  { collectionName, thirdNavTitle, orderArray }
) => {
  const parsedDir = `_${collectionName}/${thirdNavTitle}`
  await GitHubService.Create(reqDetails, {
    content: "",
    fileName: PLACEHOLDER_FILE_NAME,
    directoryName: parsedDir,
  })

  await CollectionYmlService.AddItemToOrder(reqDetails, {
    collectionName,
    item: `${thirdNavTitle}/${PLACEHOLDER_FILE_NAME}`,
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
        newFileThirdNav: thirdNavTitle,
      })
    }
  }
}

const Rename = async (
  reqDetails,
  { collectionName, oldThirdNavTitle, newThirdNavTitle }
) => {
  const thirdNavFiles = await ListFiles(reqDetails, {
    collectionName,
    thirdNavTitle: oldThirdNavTitle,
  })

  // We can't perform these operations concurrently because of conflict issues
  /* eslint-disable no-await-in-loop, no-restricted-syntax */
  for (const file of thirdNavFiles) {
    await MoverService.MovePage(reqDetails, {
      fileName: file.name,
      oldFileCollection: collectionName,
      oldFileThirdNav: oldThirdNavTitle,
      newFileCollection: collectionName,
      newFileThirdNav: newThirdNavTitle,
    })
  }

  const { sha } = await GitHubService.Read(reqDetails, {
    fileName: PLACEHOLDER_FILE_NAME,
    directoryName: `_${collectionName}/${oldThirdNavTitle}`,
  })
  await GitHubService.Delete(reqDetails, {
    fileName: PLACEHOLDER_FILE_NAME,
    directoryName: `_${collectionName}/${oldThirdNavTitle}`,
    sha,
  })
  await GitHubService.Create(reqDetails, {
    content: "",
    fileName: PLACEHOLDER_FILE_NAME,
    directoryName: `_${collectionName}/${newThirdNavTitle}`,
  })

  await CollectionYmlService.RenameSubfolderInOrder(reqDetails, {
    collectionName,
    oldSubfolder: oldThirdNavTitle,
    newSubfolder: newThirdNavTitle,
  })
}

const Delete = async (reqDetails, { collectionName, thirdNavTitle }) => {
  const dir = `_${collectionName}/${thirdNavTitle}`
  await BaseDirectoryService.Delete(reqDetails, {
    directoryName: dir,
    message: `Deleting third nav folder ${thirdNavTitle}`,
  })
  await CollectionYmlService.DeleteSubfolderFromOrder(reqDetails, {
    collectionName,
    subfolder: thirdNavTitle,
  })
}

module.exports = {
  Create,
  Rename,
  Delete,
}
