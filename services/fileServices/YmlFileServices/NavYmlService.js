const yaml = require("yaml")

const { deslugifyCollectionName } = require("@utils/utils")

const NAV_FILE_NAME = "navigation.yml"
const NAV_FILE_DIR = "_data"

class NavYmlService {
  constructor({ gitHubService }) {
    this.GitHubService = gitHubService
  }

  async Read(reqDetails) {
    const {
      content: unparsedContent,
      sha,
    } = await this.GitHubService.Read(reqDetails, {
      fileName: NAV_FILE_NAME,
      directoryName: NAV_FILE_DIR,
    })
    const content = yaml.parse(unparsedContent)
    return { content, sha }
  }

  async Update(reqDetails, { fileContent, sha }) {
    const stringifiedContent = yaml.stringify(fileContent)
    const { newSha } = await this.GitHubService.Update(reqDetails, {
      fileContent: stringifiedContent,
      sha,
      fileName: NAV_FILE_NAME,
      directoryName: NAV_FILE_DIR,
    })
    return { newSha }
  }

  async CreateCollectionInNav(reqDetails, { collectionName }) {
    const { content, sha } = await this.Read(reqDetails)
    content.links.push({
      title: deslugifyCollectionName(collectionName),
      collection: collectionName,
    })
    return this.Update(reqDetails, { fileContent: content, sha })
  }

  async RenameCollectionInNav(
    reqDetails,
    { oldCollectionName, newCollectionName }
  ) {
    const { content, sha } = await this.Read(reqDetails)
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
    return this.Update(reqDetails, { fileContent: newNavContentObject, sha })
  }

  async DeleteCollectionInNav(reqDetails, { collectionName }) {
    const { content, sha } = await this.Read(reqDetails)
    const newNavLinks = content.links.filter(
      (link) => link.collection !== collectionName
    )
    const newNavContentObject = {
      ...content,
      links: newNavLinks,
    }
    return this.Update(reqDetails, { fileContent: newNavContentObject, sha })
  }
}

module.exports = { NavYmlService }
