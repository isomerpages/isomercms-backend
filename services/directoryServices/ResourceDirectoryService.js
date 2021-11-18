const { BadRequestError } = require("@errors/BadRequestError")
const { NotFoundError } = require("@errors/NotFoundError")

const {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} = require("@utils/markdown-utils")
const { slugifyCollectionName } = require("@utils/utils")

const INDEX_FILE_NAME = "index.html"

class ResourceDirectoryService {
  constructor({ baseDirectoryService, gitHubService }) {
    this.baseDirectoryService = baseDirectoryService
    this.gitHubService = gitHubService
  }

  getResourceDirectoryPath({ resourceRoomName, resourceCategory }) {
    return `${resourceRoomName}/${resourceCategory}`
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

  async listFiles(reqDetails, { resourceRoomName, resourceCategory }) {
    let files = []
    try {
      files = await this.baseDirectoryService.list(reqDetails, {
        directoryName: `${this.getResourceDirectoryPath({
          resourceRoomName,
          resourceCategory,
        })}/_posts`,
      })
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error
    }

    return files.reduce((acc, curr) => {
      if (curr.type === "file")
        acc.push({
          name: curr.name,
          type: "file",
        })
      return acc
    }, [])
  }

  async createResourceDirectory(
    reqDetails,
    { resourceRoomName, resourceCategory }
  ) {
    if (/[^a-zA-Z0-9- ]/g.test(resourceCategory)) {
      // Contains non-allowed characters
      throw new BadRequestError(
        "Special characters not allowed in resource category name"
      )
    }
    const slugifiedResourceCategoryName = slugifyCollectionName(
      resourceCategory
    )
    const frontMatter = {
      layout: "resources-alt",
      title: resourceCategory,
    }
    const newContent = convertDataToMarkdown(frontMatter, "")
    await this.gitHubService.create(reqDetails, {
      content: newContent,
      fileName: INDEX_FILE_NAME,
      directoryName: this.getResourceDirectoryPath({
        resourceRoomName,
        resourceCategory: slugifiedResourceCategoryName,
      }),
    })
    return {
      newDirectoryName: slugifiedResourceCategoryName,
    }
  }

  async renameResourceDirectory(
    reqDetails,
    { resourceRoomName, resourceCategory, newDirectoryName }
  ) {
    if (/[^a-zA-Z0-9- ]/g.test(newDirectoryName)) {
      // Contains non-allowed characters
      throw new BadRequestError(
        "Special characters not allowed in resource category name"
      )
    }
    const oldDirectoryName = this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategory,
    })
    const slugifiedNewResourceCategoryName = slugifyCollectionName(
      newDirectoryName
    )
    const { content: rawContent, sha } = await this.gitHubService.read(
      reqDetails,
      {
        fileName: INDEX_FILE_NAME,
        directoryName: oldDirectoryName,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    frontMatter.title = newDirectoryName
    const newContent = convertDataToMarkdown(frontMatter, pageContent)
    await this.gitHubService.update(reqDetails, {
      fileContent: newContent,
      sha,
      fileName: INDEX_FILE_NAME,
      directoryName: oldDirectoryName,
    })

    await this.baseDirectoryService.rename(reqDetails, {
      oldDirectoryName,
      newDirectoryName: this.getResourceDirectoryPath({
        resourceRoomName,
        resourceCategory: slugifiedNewResourceCategoryName,
      }),
      message: `Renaming resource category ${resourceCategory} to ${slugifiedNewResourceCategoryName}`,
    })
  }

  async deleteResourceDirectory(
    reqDetails,
    { resourceRoomName, resourceCategory }
  ) {
    await this.baseDirectoryService.delete(reqDetails, {
      directoryName: this.getResourceDirectoryPath({
        resourceRoomName,
        resourceCategory,
      }),
      message: `Deleting resource category ${resourceCategory}`,
    })
  }

  async moveResourcePages(
    reqDetails,
    { resourceRoomName, resourceCategory, targetResourceCategory, objArray }
  ) {
    const targetFiles = objArray.map((item) => item.name)
    const oldDirectoryName = `${this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategory,
    })}/_posts`
    const newDirectoryName = `${this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategory: targetResourceCategory,
    })}/_posts`

    await this.baseDirectoryService.moveFiles(reqDetails, {
      oldDirectoryName,
      newDirectoryName,
      targetFiles,
      message: `Moving resource pages from ${resourceCategory} to ${targetResourceCategory}`,
    })
  }
}

module.exports = { ResourceDirectoryService }
