const { BadRequestError } = require("@errors/BadRequestError")

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

  async getResourceRoomDirectory(reqDetails) {
    const config = await this.configYmlService.read(reqDetails)
    return {
      resourceRoomName: config.content.resources_name
        ? config.content.resources_name
        : null,
    }
  }

  async createResourceRoomDirectory(reqDetails, { resourceRoomName }) {
    if (/[^a-zA-Z0-9- ]/g.test(resourceRoomName)) {
      // Contains non-allowed characters
      throw new BadRequestError(
        "Special characters not allowed in resource room name"
      )
    }
    const slugifiedResourceRoomName = slugifyCollectionName(resourceRoomName)
    const frontMatter = {
      layout: "resources",
      title: resourceRoomName,
    }
    const newContent = convertDataToMarkdown(frontMatter, "")
    await this.gitHubService.create(reqDetails, {
      content: newContent,
      fileName: INDEX_FILE_NAME,
      directoryName: slugifiedResourceRoomName,
    })

    const { content: configContent, sha } = await this.configYmlService.read(
      reqDetails
    )
    configContent.resources_name = slugifiedResourceRoomName
    await this.configYmlService.update(reqDetails, {
      fileContent: configContent,
      sha,
    })
    return {
      newDirectoryName: slugifiedResourceRoomName,
    }
  }

  async getResourceRoomDirectory(reqDetails) {
    const config = await this.configYmlService.read(reqDetails)
    return {
      resourceRoomName: config.content.resources_name
        ? config.content.resources_name
        : null,
    }
  }

  async listAllResourceCategories(reqDetails, { resourceRoomName }) {
    const filesOrDirs = await this.baseDirectoryService.list(reqDetails, {
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

  async renameResourceRoomDirectory(
    reqDetails,
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
      reqDetails,
      {
        fileName: INDEX_FILE_NAME,
        directoryName: resourceRoomName,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    frontMatter.title = newDirectoryName
    const newContent = convertDataToMarkdown(frontMatter, pageContent)
    await this.gitHubService.update(reqDetails, {
      fileContent: newContent,
      sha,
      fileName: INDEX_FILE_NAME,
      directoryName: resourceRoomName,
    })

    await this.baseDirectoryService.rename(reqDetails, {
      oldDirectoryName: resourceRoomName,
      newDirectoryName: slugifiedNewResourceRoomName,
      message: `Renaming resource room from ${resourceRoomName} to ${slugifiedNewResourceRoomName}`,
    })

    const {
      content: configContent,
      sha: configSha,
    } = await this.configYmlService.read(reqDetails)
    configContent.resources_name = slugifiedNewResourceRoomName
    await this.configYmlService.update(reqDetails, {
      fileContent: configContent,
      sha: configSha,
    })
    return {
      newDirectoryName: slugifiedNewResourceRoomName,
    }
  }

  async deleteResourceRoomDirectory(reqDetails, { resourceRoomName }) {
    await this.baseDirectoryService.delete(reqDetails, {
      directoryName: resourceRoomName,
      message: `Deleting resource room ${resourceRoomName}`,
    })

    const { content: configContent, sha } = await this.configYmlService.read(
      reqDetails
    )
    delete configContent.resources_name
    await this.configYmlService.update(reqDetails, {
      fileContent: configContent,
      sha,
    })
  }
}

module.exports = { ResourceRoomDirectoryService }
