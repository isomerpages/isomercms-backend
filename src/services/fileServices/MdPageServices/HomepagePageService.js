const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

const { HOMEPAGE_NAME } = require("@root/constants")

class HomepagePageService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  async read(sessionData) {
    const { content: rawContent, sha } = await this.gitHubService.read(
      sessionData,
      {
        fileName: HOMEPAGE_NAME,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    return { content: { frontMatter, pageBody: pageContent }, sha }
  }

  async update(sessionData, { content, frontMatter, sha }) {
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { newSha } = await this.gitHubService.update(sessionData, {
      fileContent: newContent,
      sha,
      fileName: HOMEPAGE_NAME,
    })
    return {
      content: { frontMatter, pageBody: content },
      oldSha: sha,
      newSha,
    }
  }
}

module.exports = { HomepagePageService }
