const yaml = require("yaml")

const { deslugifyCollectionName } = require("@utils/utils")

const GitHubService = require("@services/db/GitHubService")

const NAV_FILE_NAME = "navigation.yml"
const NAV_FILE_DIR = "_data"

const Read = async (reqDetails) => {
  const { content: unparsedContent, sha } = await GitHubService.Read(
    reqDetails,
    { fileName: NAV_FILE_NAME, dir: NAV_FILE_DIR }
  )
  const content = yaml.parse(unparsedContent)
  return { content, sha }
}

const Update = async (reqDetails, { fileContent, sha }) => {
  const stringifiedContent = yaml.stringify(fileContent)
  const { newSha } = await GitHubService.Update(reqDetails, {
    fileContent: stringifiedContent,
    sha,
    fileName: NAV_FILE_NAME,
    dir: NAV_FILE_DIR,
  })
  return { newSha }
}

const CreateCollectionInNav = async (reqDetails, { collectionName }) => {
  const { content, sha } = await Read(reqDetails)
  content.links.push({
    title: deslugifyCollectionName(collectionName),
    collection: collectionName,
  })
  return Update(reqDetails, { fileContent: content, sha })
}

const RenameCollectionInNav = async (
  reqDetails,
  { oldCollectionName, newCollectionName }
) => {
  const { content, sha } = await Read(reqDetails)
  const newNavLinks = content.links.map((link) => {
    if (link.collection === oldCollectionName) {
      return {
        title: deslugifyCollectionName(newCollectionName),
        collection: newCollectionName,
      }
    }
    return link
  })
  const newNavContentObject = {
    ...content,
    links: newNavLinks,
  }
  return Update(reqDetails, { fileContent: newNavContentObject, sha })
}

const DeleteCollectionInNav = async (reqDetails, { collectionName }) => {
  const { content, sha } = await Read(reqDetails)
  const newNavLinks = content.links.filter(
    (link) => link.collection !== collectionName
  )
  const newNavContentObject = {
    ...content,
    links: newNavLinks,
  }
  return Update(reqDetails, { fileContent: newNavContentObject, sha })
}

module.exports = {
  Read,
  Update,
  CreateCollectionInNav,
  RenameCollectionInNav,
  DeleteCollectionInNav,
}
