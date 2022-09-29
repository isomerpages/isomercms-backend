const { BadRequestError } = require("@errors/BadRequestError")

const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

const { titleSpecialCharCheck } = require("@validators/validators")

const UNLINKED_PAGES_DIRECTORY_NAME = "pages"

class UnlinkedPageService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  async create(
    sessionData,
    { fileName, content, frontMatter, shouldIgnoreCheck }
  ) {
    // Ensure that third_nav_title is removed for files that are being moved from collections
    if (
      !shouldIgnoreCheck &&
      titleSpecialCharCheck({ title: fileName, isFile: true })
    )
      throw new BadRequestError("Special characters not allowed in file name")
    delete frontMatter.third_nav_title
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { sha } = await this.gitHubService.create(sessionData, {
      content: newContent,
      fileName,
      directoryName: UNLINKED_PAGES_DIRECTORY_NAME,
    })
    return { fileName, content: { frontMatter, pageBody: content }, sha }
  }

  async read(sessionData, { fileName }) {
    const { content: rawContent, sha } = await this.gitHubService.read(
      sessionData,
      {
        fileName,
        directoryName: UNLINKED_PAGES_DIRECTORY_NAME,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    return { fileName, content: { frontMatter, pageBody: pageContent }, sha }
  }

  async update(sessionData, { fileName, content, frontMatter, sha }) {
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { newSha } = await this.gitHubService.update(sessionData, {
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

  async delete(sessionData, { fileName, sha }) {
    return this.gitHubService.delete(sessionData, {
      sha,
      fileName,
      directoryName: UNLINKED_PAGES_DIRECTORY_NAME,
    })
  }

  async rename(
    sessionData,
    { oldFileName, newFileName, content, frontMatter, sha }
  ) {
    if (titleSpecialCharCheck({ title: newFileName, isFile: true }))
      throw new BadRequestError("Special characters not allowed in file name")
    const newContent = convertDataToMarkdown(frontMatter, content)
    await this.gitHubService.delete(sessionData, {
      sha,
      fileName: oldFileName,
      directoryName: UNLINKED_PAGES_DIRECTORY_NAME,
    })
    const { sha: newSha } = await this.gitHubService.create(sessionData, {
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
