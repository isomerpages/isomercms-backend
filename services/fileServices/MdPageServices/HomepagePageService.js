const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

const HOMEPAGE_FILE_NAME = "index.md"

class HomepagePageService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  async read(reqDetails) {
    const { content: rawContent, sha } = await this.gitHubService.read(
      reqDetails,
      {
        fileName: HOMEPAGE_FILE_NAME,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    return { fileName, content: { frontMatter, pageBody: pageContent }, sha }
  }

  async update(reqDetails, { content, frontMatter, sha }) {
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { newSha } = await this.gitHubService.update(reqDetails, {
      fileContent: newContent,
      sha,
      fileName: HOMEPAGE_FILE_NAME,
    })
    return {
      fileName,
      content: { frontMatter, pageBody: content },
      oldSha: sha,
      newSha,
    }
  }
}

module.exports = { HomepagePageService }
