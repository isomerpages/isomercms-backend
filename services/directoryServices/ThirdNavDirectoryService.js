const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")
const { deslugifyCollectionName } = require("@utils/utils.js")

const GitHubService = require("@services/db/GitHubService")
const ThirdNavPageService = require("@services/fileServices/MdPageServices/ThirdNavPageService")

const CollectionYmlService = require("../fileServices/YmlFileServices/CollectionYmlService")

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
  // TODO: move files in order array if necessary
}

const Rename = async (
  reqDetails,
  { directoryName, oldThirdNavTitle, newThirdNavTitle }
) => {
  await BaseDirectoryService.Rename(reqDetails, {
    oldDirectoryName: `_${directoryName}/${oldThirdNavTitle}`,
    newDirectoryName: `_${directoryName}/${newThirdNavTitle}`,
    message: `Renaming third nav folder ${oldThirdNavTitle} to ${newThirdNavTitle}`,
  })
  const thirdNavFiles = await ListFiles(reqDetails, {
    directoryName,
    thirdNavTitle: newThirdNavTitle,
  })

  // We can't perform these operations concurrently because of conflict issues
  /* eslint-disable no-await-in-loop, no-restricted-syntax */
  for (const file of thirdNavFiles) {
    const fileName = file.name
    const { content, sha } = await ThirdNavPageService.Read(reqDetails, {
      fileName,
      collectionName: directoryName,
      thirdNavTitle: newThirdNavTitle,
    })
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(content)
    frontMatter.third_nav_title = deslugifyCollectionName(newThirdNavTitle)
    const newContent = convertDataToMarkdown(frontMatter, pageContent)
    await ThirdNavPageService.Update(reqDetails, {
      fileName,
      collectionName: directoryName,
      thirdNavTitle: newThirdNavTitle,
      content: newContent,
      sha,
    })
  }

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
