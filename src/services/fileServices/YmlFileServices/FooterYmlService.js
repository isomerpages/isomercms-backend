const yaml = require("yaml")

const FOOTER_FILE_NAME = "footer.yml"
const FOOTER_FILE_DIR = "_data"

class FooterYmlService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  async read(reqDetails) {
    const { content: unparsedContent, sha } = await this.gitHubService.read(
      reqDetails,
      {
        fileName: FOOTER_FILE_NAME,
        directoryName: FOOTER_FILE_DIR,
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
      fileName: FOOTER_FILE_NAME,
      directoryName: FOOTER_FILE_DIR,
    })
    return { newSha }
  }
}

module.exports = { FooterYmlService }
