const { BadRequestError } = require("@errors/BadRequestError")
const { ConflictError } = require("@errors/ConflictError")

const {
  convertDataToMarkdown,
  retrieveDataFromMarkdown,
} = require("@utils/markdown-utils")
const { slugifyCollectionName } = require("@utils/utils")

const INDEX_FILE_NAME = "index.html"

class ResourceRoomDirectoryService {
  constructor({ baseDirectoryService, configYmlService, gitHubService }) {
    this.baseDirectoryService = baseDirectoryService
    this.configYmlService = configYmlService
    this.gitHubService = gitHubService
  }

  async listAllResourceCategories(sessionData, { resourceRoomName }) {
    const filesOrDirs = await this.baseDirectoryService.list(sessionData, {
      directoryName: `${resourceRoomName}`,
    })
    return filesOrDirs.reduce((acc, curr) => {
      if (curr.type === "dir")
        acc.push({
          name: curr.name,
          type: "dir",
        })
      return acc
    }, [])
  }

  async getResourceRoomDirectoryName(sessionData) {
    const config = await this.configYmlService.read(sessionData)
    return {
      resourceRoomName: config.content.resources_name
        ? config.content.resources_name
        : null,
    }
  }

  async createResourceRoomDirectory(sessionData, { resourceRoomName }) {
    if (/[^a-zA-Z0-9- ]/g.test(resourceRoomName)) {
      // Contains non-allowed characters
      throw new BadRequestError(
        "Special characters not allowed in resource room name"
      )
    }
    const slugifiedResourceRoomName = slugifyCollectionName(resourceRoomName)
    const { content: configContent, sha } = await this.configYmlService.read(
      sessionData
    )
    // If resource room already exists, throw error
    if ("resources_name" in configContent && configContent.resources_name)
      throw new ConflictError("Resource room already exists")
    configContent.resources_name = slugifiedResourceRoomName
    await this.configYmlService.update(sessionData, {
      fileContent: configContent,
      sha,
    })
    const frontMatter = {
      layout: "resources",
      title: resourceRoomName,
    }
    const newContent = convertDataToMarkdown(frontMatter, "")
    await this.gitHubService.create(sessionData, {
      content: newContent,
      fileName: INDEX_FILE_NAME,
      directoryName: slugifiedResourceRoomName,
    })
    return {
      newDirectoryName: slugifiedResourceRoomName,
    }
  }

  async renameResourceRoomDirectory(
    sessionData,
    githubSessionData,
    { resourceRoomName, newDirectoryName }
  ) {
    if (/[^a-zA-Z0-9- ]/g.test(newDirectoryName)) {
      // Contains non-allowed characters
      throw new BadRequestError(
        "Special characters not allowed in resource category name"
      )
    }
    const slugifiedNewResourceRoomName = slugifyCollectionName(newDirectoryName)

    const { content: rawContent, sha } = await this.gitHubService.read(
      sessionData,
      {
        fileName: INDEX_FILE_NAME,
        directoryName: resourceRoomName,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    frontMatter.title = newDirectoryName
    const newContent = convertDataToMarkdown(frontMatter, pageContent)

    await this.baseDirectoryService.rename(sessionData, githubSessionData, {
      oldDirectoryName: resourceRoomName,
      newDirectoryName: slugifiedNewResourceRoomName,
      message: `Renaming resource room from ${resourceRoomName} to ${slugifiedNewResourceRoomName}`,
    })
    await this.gitHubService.update(sessionData, {
      fileContent: newContent,
      sha,
      fileName: INDEX_FILE_NAME,
      directoryName: slugifiedNewResourceRoomName,
    })

    const {
      content: configContent,
      sha: configSha,
    } = await this.configYmlService.read(sessionData)
    configContent.resources_name = slugifiedNewResourceRoomName
    await this.configYmlService.update(sessionData, {
      fileContent: configContent,
      sha: configSha,
    })
    return {
      newDirectoryName: slugifiedNewResourceRoomName,
    }
  }

  async deleteResourceRoomDirectory(
    sessionData,
    githubSessionData,
    { resourceRoomName }
  ) {
    await this.baseDirectoryService.delete(sessionData, githubSessionData, {
      directoryName: resourceRoomName,
      message: `Deleting resource room ${resourceRoomName}`,
    })

    const { content: configContent, sha } = await this.configYmlService.read(
      sessionData
    )
    delete configContent.resources_name
    await this.configYmlService.update(sessionData, {
      fileContent: configContent,
      sha,
    })
  }
}

module.exports = { ResourceRoomDirectoryService }
