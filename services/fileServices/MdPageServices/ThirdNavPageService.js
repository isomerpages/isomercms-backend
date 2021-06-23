const { deslugifyCollectionName } = require("@utils/utils")

const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("../../../utils/markdown-utils")
const GitHubService = require("../../db/GitHubService")
const CollectionYmlService = require("../YmlFileServices/CollectionYmlService")

const Create = async (
  reqDetails,
  { fileName, collectionName, thirdNavTitle, content }
) => {
  const parsedDirectoryName = `_${collectionName}/${thirdNavTitle}`

  await CollectionYmlService.AddItemToOrder(reqDetails, {
    collectionName,
    item: `${thirdNavTitle}/${fileName}`,
  })

  // TODO: consider having frontend pass frontmatter separately from page content
  const { frontMatter, pageContent } = retrieveDataFromMarkdown(content)
  frontMatter.third_nav_title = deslugifyCollectionName(thirdNavTitle)
  const newContent = convertDataToMarkdown(frontMatter, pageContent)

  return GitHubService.Create(reqDetails, {
    content: newContent,
    fileName,
    dir: parsedDirectoryName,
  })
}

const Read = async (
  reqDetails,
  { fileName, collectionName, thirdNavTitle }
) => {
  const parsedDirectoryName = `_${collectionName}/${thirdNavTitle}`
  return GitHubService.Read(reqDetails, { fileName, dir: parsedDirectoryName })
}

const Update = async (
  reqDetails,
  { fileName, collectionName, thirdNavTitle, content, sha }
) => {
  const parsedDirectoryName = `_${collectionName}/${thirdNavTitle}`
  return GitHubService.Update(reqDetails, {
    fileContent: content,
    sha,
    fileName,
    dir: parsedDirectoryName,
  })
}

const Delete = async (
  reqDetails,
  { fileName, collectionName, thirdNavTitle, sha }
) => {
  const parsedDirectoryName = `_${collectionName}/${thirdNavTitle}`

  // Remove from collection.yml
  await CollectionYmlService.DeleteItemFromOrder(reqDetails, {
    collectionName,
    item: `${thirdNavTitle}/${fileName}`,
  })
  return GitHubService.Delete(reqDetails, {
    sha,
    fileName,
    dir: parsedDirectoryName,
  })
}

const Rename = async (
  reqDetails,
  { oldFileName, newFileName, collectionName, thirdNavTitle }
) => {
  const { content, sha } = await Read(reqDetails, {
    fileName: oldFileName,
    collectionName,
    thirdNavTitle,
  })
  await Delete(reqDetails, {
    fileName: oldFileName,
    collectionName,
    thirdNavTitle,
    sha,
  })
  await Create(reqDetails, {
    fileName: newFileName,
    collectionName,
    thirdNavTitle,
    content,
  })
  return { newSha: sha }
}

module.exports = {
  Create,
  Read,
  Update,
  Delete,
  Rename,
}
