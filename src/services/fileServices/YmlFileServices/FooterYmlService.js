const {
  sanitizedYamlParse,
  sanitizedYamlStringify,
} = require("@utils/yaml-utils")

const FOOTER_FILE_NAME = "footer.yml"
const FOOTER_FILE_DIR = "_data"

class FooterYmlService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  async read(sessionData) {
    const { content: unparsedContent, sha } = await this.gitHubService.read(
      sessionData,
      {
        fileName: FOOTER_FILE_NAME,
        directoryName: FOOTER_FILE_DIR,
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
      fileName: FOOTER_FILE_NAME,
      directoryName: FOOTER_FILE_DIR,
    })
    return { newSha }
  }
}

module.exports = { FooterYmlService }
