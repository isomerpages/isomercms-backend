const yaml = require("yaml")

const CONFIG_FILE_NAME = "_config.yml"

class ConfigYmlService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  async read(sessionData) {
    const { content: unparsedContent, sha } = await this.gitHubService.read(
      sessionData,
      {
        fileName: CONFIG_FILE_NAME,
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
      fileName: CONFIG_FILE_NAME,
    })
    return { newSha }
  }
}

module.exports = { ConfigYmlService }
