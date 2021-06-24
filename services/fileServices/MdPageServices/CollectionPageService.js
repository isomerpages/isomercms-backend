const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

const GitHubService = require("@services/db/GitHubService")
const CollectionYmlService = require("@services/fileServices/YmlFileServices/CollectionYmlService")

const Create = async (reqDetails, { fileName, collectionName, content }) => {
  const parsedCollectionName = `_${collectionName}`

  await CollectionYmlService.AddItemToOrder(reqDetails, {
    collectionName,
    item: fileName,
  })

  // We want to make sure that the front matter has no third nav title parameter
  // TODO: consider having frontend pass frontmatter separately from page content
  const { frontMatter, pageContent } = retrieveDataFromMarkdown(content)
  delete frontMatter.third_nav_title
  const newContent = convertDataToMarkdown(frontMatter, pageContent)

  return GitHubService.Create(reqDetails, {
    content: newContent,
    fileName,
    dir: parsedCollectionName,
  })
}

const Read = async (reqDetails, { fileName, collectionName }) => {
  const parsedCollectionName = `_${collectionName}`
  return GitHubService.Read(reqDetails, { fileName, dir: parsedCollectionName })
}

const Update = async (
  reqDetails,
  { fileName, collectionName, content, sha }
) => {
  const parsedCollectionName = `_${collectionName}`
  return GitHubService.Update(reqDetails, {
    fileContent: content,
    sha,
    fileName,
    dir: parsedCollectionName,
  })
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
    dir: parsedCollectionName,
  })
}

const Rename = async (
  reqDetails,
  { oldFileName, newFileName, collectionName, content, sha }
) => {
  await Delete(reqDetails, { fileName: oldFileName, collectionName, sha })
  await Create(reqDetails, { fileName: newFileName, collectionName, content })
  return { newSha: sha }
}

module.exports = {
  Create,
  Read,
  Update,
  Delete,
  Rename,
}
