const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")
const { deslugifyCollectionName } = require("@utils/utils.js")

const GitHubService = require("@services/db/GitHubService")
const ThirdNavPageService = require("@services/fileServices/MdPageServices/ThirdNavPageService")
const CollectionYmlService = require("@services/fileServices/YmlFileServices/CollectionYmlService")
const MoverService = require("@services/MoverService")

const BaseDirectoryService = require("./BaseDirectoryService")

const PLACEHOLDER_FILE_NAME = ".keep"

const ListFiles = async (reqDetails, { directoryName, thirdNavTitle }) => {
  const files = await BaseDirectoryService.List(reqDetails, {
    directoryName: `_${directoryName}/${thirdNavTitle}`,
  })
  return files.filter((file) => file.name !== PLACEHOLDER_FILE_NAME)
}

const Create = async (
  reqDetails,
  { directoryName, thirdNavTitle, orderArray }
) => {
  const dir = `_${directoryName}/${thirdNavTitle}`
  await GitHubService.Create(reqDetails, {
    content: "",
    fileName: PLACEHOLDER_FILE_NAME,
    dir,
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
        newFileThirdNav: thirdNavTitle,
      })
    }
  }
}

const Rename = async (
  reqDetails,
  { directoryName, oldThirdNavTitle, newThirdNavTitle }
) => {
  const thirdNavFiles = await ListFiles(reqDetails, {
    directoryName,
    thirdNavTitle: oldThirdNavTitle,
  })

  // We can't perform these operations concurrently because of conflict issues
  /* eslint-disable no-await-in-loop, no-restricted-syntax */
  for (const file of thirdNavFiles) {
    await MoverService.MovePage(reqDetails, {
      fileName: file.name,
      oldFileDirectory: directoryName,
      oldFileThirdNav: oldThirdNavTitle,
      newFileDirectory: directoryName,
      newFileThirdNav: newThirdNavTitle,
    })
  }

  const { sha } = await GitHubService.Read(reqDetails, {
    fileName: PLACEHOLDER_FILE_NAME,
    dir: `_${directoryName}/${oldThirdNavTitle}`,
  })
  await GitHubService.Delete(reqDetails, {
    fileName: PLACEHOLDER_FILE_NAME,
    dir: `_${directoryName}/${oldThirdNavTitle}`,
    sha,
  })
  await GitHubService.Create(reqDetails, {
    content: "",
    fileName: PLACEHOLDER_FILE_NAME,
    dir: `_${directoryName}/${newThirdNavTitle}`,
  })

  await CollectionYmlService.RenameSubfolderInOrder(reqDetails, {
    collectionName: directoryName,
    oldSubfolder: oldThirdNavTitle,
    newSubfolder: newThirdNavTitle,
  })
}

const Delete = async (reqDetails, { directoryName, thirdNavTitle }) => {
  const dir = `_${directoryName}/${thirdNavTitle}`
  await BaseDirectoryService.Delete(reqDetails, {
    directoryName: dir,
    message: `Deleting third nav folder ${thirdNavTitle}`,
  })
  await CollectionYmlService.DeleteSubfolderFromOrder(reqDetails, {
    collectionName: directoryName,
    subfolder: thirdNavTitle,
  })
}

module.exports = {
  Create,
  Rename,
  Delete,
}
