const { BadRequestError } = require("@errors/BadRequestError")

const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")

const { hasSpecialCharInTitle, isDateValid } = require("@validators/validators")

class ResourcePageService {
  constructor({ gitHubService }) {
    this.gitHubService = gitHubService
  }

  validateAndRetrieveResourceFileMetadata(fileName) {
    const fileNameArray = fileName.split(".md")[0]
    const tokenArray = fileNameArray.split("-")
    const date = tokenArray.slice(0, 3).join("-")
    if (!isDateValid(date))
      throw new BadRequestError("Special characters not allowed in file name")

    const type = ["file", "post", "link"].includes(tokenArray[3])
      ? tokenArray[3]
      : undefined

    const titleTokenArray = type ? tokenArray.slice(4) : tokenArray.slice(3)
    const title = titleTokenArray.join("-")

    if (hasSpecialCharInTitle({ title, isFile: true }))
      throw new BadRequestError(
        `Special characters not allowed when creating resource files. Given name: ${title}`
      )

    return { date, type, title }
  }

  getResourceDirectoryPath({ resourceRoomName, resourceCategoryName }) {
    return `${resourceRoomName}/${resourceCategoryName}/_posts`
  }

  async create(
    sessionData,
    { fileName, resourceRoomName, resourceCategoryName, content, frontMatter }
  ) {
    this.validateAndRetrieveResourceFileMetadata(fileName)
    const parsedDirectoryName = this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategoryName,
    })

    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha } = await this.gitHubService.create(sessionData, {
      content: newContent,
      fileName,
      directoryName: parsedDirectoryName,
    })
    return { fileName, content: { frontMatter, pageBody: content }, sha }
  }

  async read(
    sessionData,
    { fileName, resourceRoomName, resourceCategoryName }
  ) {
    const parsedDirectoryName = this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategoryName,
    })
    const { content: rawContent, sha } = await this.gitHubService.read(
      sessionData,
      {
        fileName,
        directoryName: parsedDirectoryName,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    return { fileName, content: { frontMatter, pageBody: pageContent }, sha }
  }

  async update(
    sessionData,
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
    const { newSha } = await this.gitHubService.update(sessionData, {
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
    sessionData,
    { fileName, resourceRoomName, resourceCategoryName, sha }
  ) {
    const parsedDirectoryName = this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategoryName,
    })

    return this.gitHubService.delete(sessionData, {
      sha,
      fileName,
      directoryName: parsedDirectoryName,
    })
  }

  async rename(
    sessionData,
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
    this.validateAndRetrieveResourceFileMetadata(newFileName)
    const parsedDirectoryName = this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategoryName,
    })

    await this.gitHubService.delete(sessionData, {
      sha,
      fileName: oldFileName,
      directoryName: parsedDirectoryName,
    })

    const newContent = convertDataToMarkdown(frontMatter, content)

    const { sha: newSha } = await this.gitHubService.create(sessionData, {
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
