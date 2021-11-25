const { BadRequestError } = require("@errors/BadRequestError")

const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

const { titleSpecialCharCheck } = require("@validators/validators")

class ResourcePageService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  getResourceDirectoryPath({ resourceRoomName, resourceCategoryName }) {
    return `${resourceRoomName}/${resourceCategoryName}/_posts`
  }

  async create(
    reqDetails,
    { fileName, resourceRoomName, resourceCategoryName, content, frontMatter }
  ) {
    if (titleSpecialCharCheck({ title: fileName, isFile: true }))
      throw new BadRequestError("Special characters not allowed in file name")
    const parsedDirectoryName = this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategoryName,
    })

    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha } = await this.gitHubService.create(reqDetails, {
      content: newContent,
      fileName,
      directoryName: parsedDirectoryName,
    })
    return { fileName, content: { frontMatter, pageBody: content }, sha }
  }

  async read(reqDetails, { fileName, resourceRoomName, resourceCategoryName }) {
    const parsedDirectoryName = this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategoryName,
    })
    const { content: rawContent, sha } = await this.gitHubService.read(
      reqDetails,
      {
        fileName,
        directoryName: parsedDirectoryName,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    return { fileName, content: { frontMatter, pageBody: pageContent }, sha }
  }

  async update(
    reqDetails,
    {
      fileName,
      resourceRoomName,
      resourceCategoryName,
      content,
      frontMatter,
      sha,
    }
  ) {
    const parsedDirectoryName = this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategoryName,
    })
    const newContent = convertDataToMarkdown(frontMatter, content)
    const { newSha } = await this.gitHubService.update(reqDetails, {
      fileContent: newContent,
      sha,
      fileName,
      directoryName: parsedDirectoryName,
    })
    return {
      fileName,
      content: { frontMatter, pageBody: content },
      oldSha: sha,
      newSha,
    }
  }

  async delete(
    reqDetails,
    { fileName, resourceRoomName, resourceCategoryName, sha }
  ) {
    const parsedDirectoryName = this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategoryName,
    })

    return this.gitHubService.delete(reqDetails, {
      sha,
      fileName,
      directoryName: parsedDirectoryName,
    })
  }

  async rename(
    reqDetails,
    {
      oldFileName,
      newFileName,
      resourceRoomName,
      resourceCategoryName,
      content,
      frontMatter,
      sha,
    }
  ) {
    if (titleSpecialCharCheck({ title: newFileName, isFile: true }))
      throw new BadRequestError("Special characters not allowed in file name")
    const parsedDirectoryName = this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategoryName,
    })

    await this.gitHubService.delete(reqDetails, {
      sha,
      fileName: oldFileName,
      directoryName: parsedDirectoryName,
    })

    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha: newSha } = await this.gitHubService.create(reqDetails, {
      content: newContent,
      fileName: newFileName,
      directoryName: parsedDirectoryName,
    })
    return {
      fileName: newFileName,
      content: { frontMatter, pageBody: content },
      oldSha: sha,
      newSha,
    }
  }
}

module.exports = { ResourcePageService }
