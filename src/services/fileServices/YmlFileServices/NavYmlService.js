const { deslugifyCollectionName } = require("@utils/utils")
const {
  sanitizedYamlParse,
  sanitizedYamlStringify,
} = require("@utils/yaml-utils")

const NAV_FILE_NAME = "navigation.yml"
const NAV_FILE_DIR = "_data"

class NavYmlService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  async read(sessionData) {
    const { content: unparsedContent, sha } = await this.gitHubService.read(
      sessionData,
      {
        fileName: NAV_FILE_NAME,
        directoryName: NAV_FILE_DIR,
      }
    )
    const content = sanitizedYamlParse(unparsedContent)
    return { content, sha }
  }

  async update(sessionData, { fileContent, sha }) {
    const stringifiedContent = sanitizedYamlStringify(fileContent)
    const { newSha } = await this.gitHubService.update(sessionData, {
      fileContent: stringifiedContent,
      sha,
      fileName: NAV_FILE_NAME,
      directoryName: NAV_FILE_DIR,
    })
    return { newSha }
  }

  async createCollectionInNav(sessionData, { collectionName }) {
    const { content, sha } = await this.read(sessionData)
    content.links.push({
      title: deslugifyCollectionName(collectionName),
      collection: collectionName,
    })
    return this.update(sessionData, { fileContent: content, sha })
  }

  async renameCollectionInNav(
    sessionData,
    { oldCollectionName, newCollectionName }
  ) {
    const { content, sha } = await this.read(sessionData)
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
    return this.update(sessionData, { fileContent: newNavContentObject, sha })
  }

  async deleteCollectionInNav(sessionData, { collectionName }) {
    const { content, sha } = await this.read(sessionData)
    const newNavLinks = content.links.filter(
      (link) => link.collection !== collectionName
    )
    const newNavContentObject = {
      ...content,
      links: newNavLinks,
    }
    return this.update(sessionData, { fileContent: newNavContentObject, sha })
  }
}

module.exports = { NavYmlService }
