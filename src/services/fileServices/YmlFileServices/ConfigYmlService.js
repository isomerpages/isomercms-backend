const {
  sanitizedYamlParse,
  sanitizedYamlStringify,
} = require("@utils/yaml-utils")

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
    const sanitisedContent = sanitizedYamlParse(unparsedContent)
    const content = {
      ...sanitisedContent,
      "facebook-pixel": sanitisedContent["facebook-pixel"]
        ? parseInt(sanitisedContent["facebook-pixel"], 10)
        : null,
    }
    return { content, sha }
  }

  async update(sessionData, { fileContent, sha }) {
    const stringifiedContent = sanitizedYamlStringify(fileContent)
    const { newSha } = await this.gitHubService.update(sessionData, {
      fileContent: stringifiedContent,
      sha,
      fileName: CONFIG_FILE_NAME,
    })
    return { newSha }
  }
}

module.exports = { ConfigYmlService }
