const { deslugifyCollectionName } = require("@utils/utils")

const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("../../../utils/markdown-utils")
const GitHubService = require("../../db/GitHubService")
const CollectionYmlService = require("../YmlFileServices/CollectionYmlService")

const Create = async (
  reqDetails,
  { fileName, collectionName, thirdNavTitle, content, frontMatter }
) => {
  const parsedDirectoryName = `_${collectionName}/${thirdNavTitle}`

  await CollectionYmlService.AddItemToOrder(reqDetails, {
    collectionName,
    item: `${thirdNavTitle}/${fileName}`,
  })

  frontMatter.third_nav_title = deslugifyCollectionName(thirdNavTitle)
  const newContent = convertDataToMarkdown(frontMatter, content)

  const { sha } = await GitHubService.Create(reqDetails, {
    content: newContent,
    fileName,
    directoryName: parsedDirectoryName,
  })
  return { fileName, content: { frontMatter, content }, sha }
}

const Read = async (
  reqDetails,
  { fileName, collectionName, thirdNavTitle }
) => {
  const parsedDirectoryName = `_${collectionName}/${thirdNavTitle}`
  const { content: rawContent, sha } = await GitHubService.Read(reqDetails, {
    fileName,
    directoryName: parsedDirectoryName,
  })
  const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
  return { fileName, content: { frontMatter, pageBody: pageContent }, sha }
}

const Update = async (
  reqDetails,
  { fileName, collectionName, thirdNavTitle, content, frontMatter, sha }
) => {
  const parsedDirectoryName = `_${collectionName}/${thirdNavTitle}`
  const newContent = convertDataToMarkdown(frontMatter, content)
  const { newSha } = await GitHubService.Update(reqDetails, {
    fileContent: newContent,
    sha,
    fileName,
    directoryName: parsedDirectoryName,
  })
  return { fileName, content: { frontMatter, content }, oldSha: sha, newSha }
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
    directoryName: parsedDirectoryName,
  })
}

const Rename = async (
  reqDetails,
  {
    oldFileName,
    newFileName,
    collectionName,
    thirdNavTitle,
    content,
    frontMatter,
    sha,
  }
) => {
  await Delete(reqDetails, {
    fileName: oldFileName,
    collectionName,
    thirdNavTitle,
    sha,
  })
  const { sha: newSha } = await Create(reqDetails, {
    fileName: newFileName,
    collectionName,
    thirdNavTitle,
    content,
    frontMatter,
  })
  return {
    fileName: newFileName,
    content: { frontMatter, content },
    oldSha: sha,
    newSha,
  }
}

module.exports = {
  Create,
  Read,
  Update,
  Delete,
  Rename,
}
