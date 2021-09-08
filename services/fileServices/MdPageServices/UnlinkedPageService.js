const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

const UNLINKED_PAGES_DIRECTORY_NAME = "pages"

class UnlinkedPageService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  async create(reqDetails, { fileName, content, frontMatter }) {
    // Ensure that third_nav_title is removed for files that are being moved from collections
    delete frontMatter.third_nav_title
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { sha } = await this.gitHubService.create(reqDetails, {
      content: newContent,
      fileName,
      directoryName: UNLINKED_PAGES_DIRECTORY_NAME,
    })
    return { fileName, content: { frontMatter, pageBody: content }, sha }
  }

  async read(reqDetails, { fileName }) {
    const { content: rawContent, sha } = await this.gitHubService.read(
      reqDetails,
      {
        fileName,
        directoryName: UNLINKED_PAGES_DIRECTORY_NAME,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    return { fileName, content: { frontMatter, pageBody: pageContent }, sha }
  }

  async update(reqDetails, { fileName, content, frontMatter, sha }) {
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { newSha } = await this.gitHubService.update(reqDetails, {
      fileContent: newContent,
      sha,
      fileName,
      directoryName: UNLINKED_PAGES_DIRECTORY_NAME,
    })
    return {
      fileName,
      content: { frontMatter, pageBody: content },
      oldSha: sha,
      newSha,
    }
  }

  async delete(reqDetails, { fileName, sha }) {
    return this.gitHubService.delete(reqDetails, {
      sha,
      fileName,
      directoryName: UNLINKED_PAGES_DIRECTORY_NAME,
    })
  }

  async rename(
    reqDetails,
    { oldFileName, newFileName, content, frontMatter, sha }
  ) {
    const newContent = convertDataToMarkdown(frontMatter, content)
    await this.gitHubService.delete(reqDetails, {
      sha,
      fileName: oldFileName,
      directoryName: UNLINKED_PAGES_DIRECTORY_NAME,
    })
    const { sha: newSha } = await this.gitHubService.create(reqDetails, {
      content: newContent,
      fileName: newFileName,
      directoryName: UNLINKED_PAGES_DIRECTORY_NAME,
    })
    return {
      fileName: newFileName,
      content: { frontMatter, pageBody: content },
      oldSha: sha,
      newSha,
    }
  }
}

module.exports = { UnlinkedPageService }
