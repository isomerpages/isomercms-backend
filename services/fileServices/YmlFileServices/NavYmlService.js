const yaml = require("yaml")

const { deslugifyCollectionName } = require("@utils/utils")

const NAV_FILE_NAME = "navigation.yml"
const NAV_FILE_DIR = "_data"

class NavYmlService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  async read(reqDetails) {
    const { content: unparsedContent, sha } = await this.gitHubService.read(
      reqDetails,
      {
        fileName: NAV_FILE_NAME,
        directoryName: NAV_FILE_DIR,
      }
    )
    const content = yaml.parse(unparsedContent)
    return { content, sha }
  }

  async update(reqDetails, { fileContent, sha }) {
    const stringifiedContent = yaml.stringify(fileContent)
    const { newSha } = await this.gitHubService.update(reqDetails, {
      fileContent: stringifiedContent,
      sha,
      fileName: NAV_FILE_NAME,
      directoryName: NAV_FILE_DIR,
    })
    return { newSha }
  }

  async createCollectionInNav(reqDetails, { collectionName }) {
    const { content, sha } = await this.read(reqDetails)
    content.links.push({
      title: deslugifyCollectionName(collectionName),
      collection: collectionName,
    })
    return this.update(reqDetails, { fileContent: content, sha })
  }

  async renameCollectionInNav(
    reqDetails,
    { oldCollectionName, newCollectionName }
  ) {
    const { content, sha } = await this.read(reqDetails)
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
    return this.update(reqDetails, { fileContent: newNavContentObject, sha })
  }

  async deleteCollectionInNav(reqDetails, { collectionName }) {
    const { content, sha } = await this.read(reqDetails)
    const newNavLinks = content.links.filter(
      (link) => link.collection !== collectionName
    )
    const newNavContentObject = {
      ...content,
      links: newNavLinks,
    }
    return this.update(reqDetails, { fileContent: newNavContentObject, sha })
  }
}

module.exports = { NavYmlService }
