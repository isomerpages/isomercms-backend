const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

const GitHubService = require("@services/db/GitHubService")
const CollectionYmlService = require("@services/fileServices/YmlFileServices/CollectionYmlService")

const Create = async (
  reqDetails,
  { fileName, collectionName, content, frontMatter }
) => {
  const parsedCollectionName = `_${collectionName}`

  await CollectionYmlService.AddItemToOrder(reqDetails, {
    collectionName,
    item: fileName,
  })

  // We want to make sure that the front matter has no third nav title parameter
  delete frontMatter.third_nav_title
  const newContent = convertDataToMarkdown(frontMatter, content)

  const { sha } = await GitHubService.Create(reqDetails, {
    content: newContent,
    fileName,
    directoryName: parsedCollectionName,
  })
  return { fileName, content: { frontMatter, content }, sha }
}

const Read = async (reqDetails, { fileName, collectionName }) => {
  const parsedCollectionName = `_${collectionName}`
  const { content: rawContent, sha } = await GitHubService.Read(reqDetails, {
    fileName,
    directoryName: parsedCollectionName,
  })
  const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
  return { fileName, content: { frontMatter, pageBody: pageContent }, sha }
}

const Update = async (
  reqDetails,
  { fileName, collectionName, content, frontMatter, sha }
) => {
  const parsedCollectionName = `_${collectionName}`
  const newContent = convertDataToMarkdown(frontMatter, content)
  const { newSha } = await GitHubService.Update(reqDetails, {
    fileContent: newContent,
    sha,
    fileName,
    directoryName: parsedCollectionName,
  })
  return { fileName, content: { frontMatter, content }, oldSha: sha, newSha }
}

const Delete = async (reqDetails, { fileName, collectionName, sha }) => {
  const parsedCollectionName = `_${collectionName}`

  // Remove from collection.yml
  await CollectionYmlService.DeleteItemFromOrder(reqDetails, {
    collectionName,
    item: fileName,
  })
  return GitHubService.Delete(reqDetails, {
    sha,
    fileName,
    directoryName: parsedCollectionName,
  })
}

const Rename = async (
  reqDetails,
  { oldFileName, newFileName, collectionName, content, frontMatter, sha }
) => {
  await Delete(reqDetails, { fileName: oldFileName, collectionName, sha })
  const { sha: newSha } = await Create(reqDetails, {
    fileName: newFileName,
    collectionName,
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
