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

  getResourceDirectoryPath({ resourceRoomName, resourceCategoryName }) {
    return `${resourceRoomName}/${resourceCategoryName}`
  }

  async listFiles(sessionData, { resourceRoomName, resourceCategoryName }) {
    const resourceCategories = await this.baseDirectoryService.list(
      sessionData,
      {
        directoryName: `${resourceRoomName}`,
      }
    )
    if (
      !resourceCategories.find(
        (element) => element.name === resourceCategoryName
      )
    )
      throw new NotFoundError("Resource category does not exist")
    let files = []
    try {
      files = await this.baseDirectoryService.list(sessionData, {
        directoryName: `${this.getResourceDirectoryPath({
          resourceRoomName,
          resourceCategoryName,
        })}/_posts`,
      })
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error
    }

    return files.reduce((acc, curr) => {
      if (curr.type === "file") {
        const fileName = curr.name
        const fileNameArray = fileName.split(".md")[0]
        const tokenArray = fileNameArray.split("-")
        const date = tokenArray.slice(0, 3).join("-")

        const resourceType = ["file", "post"].includes(tokenArray[3])
          ? tokenArray[3]
          : undefined

        const titleTokenArray = resourceType
          ? tokenArray.slice(4)
          : tokenArray.slice(3)
        const prettifiedTitleTokenArray = titleTokenArray.map(
          (token) => token.slice(0, 1).toUpperCase() + token.slice(1)
        )
        const title = prettifiedTitleTokenArray.join(" ")

        acc.push({
          name: curr.name,
          type: "file",
          title,
          date,
          resourceType,
        })
      }
      return acc
    }, [])
  }

  async createResourceDirectory(
    sessionData,
    { resourceRoomName, resourceCategoryName }
  ) {
    if (/[^a-zA-Z0-9- ]/g.test(resourceCategoryName)) {
      // Contains non-allowed characters
      throw new BadRequestError(
        "Special characters not allowed in resource category name"
      )
    }
    const slugifiedResourceCategoryName = slugifyCollectionName(
      resourceCategoryName
    )
    const frontMatter = {
      layout: "resources-alt",
      title: resourceCategoryName,
    }
    const newContent = convertDataToMarkdown(frontMatter, "")
    await this.gitHubService.create(sessionData, {
      content: newContent,
      fileName: INDEX_FILE_NAME,
      directoryName: this.getResourceDirectoryPath({
        resourceRoomName,
        resourceCategoryName: slugifiedResourceCategoryName,
      }),
    })
    return {
      newDirectoryName: slugifiedResourceCategoryName,
    }
  }

  async renameResourceDirectory(
    sessionData,
    githubSessionData,
    { resourceRoomName, resourceCategoryName, newDirectoryName }
  ) {
    if (/[^a-zA-Z0-9- ]/g.test(newDirectoryName)) {
      // Contains non-allowed characters
      throw new BadRequestError(
        "Special characters not allowed in resource category name"
      )
    }
    const oldDirectoryName = this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategoryName,
    })
    const slugifiedNewResourceCategoryName = slugifyCollectionName(
      newDirectoryName
    )
    const { content: rawContent, sha } = await this.gitHubService.read(
      sessionData,
      {
        fileName: INDEX_FILE_NAME,
        directoryName: oldDirectoryName,
      }
    )
    const { frontMatter, pageContent } = retrieveDataFromMarkdown(rawContent)
    frontMatter.title = newDirectoryName
    const newContent = convertDataToMarkdown(frontMatter, pageContent)
    const newDirectoryPath = this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategoryName: slugifiedNewResourceCategoryName,
    })

    await this.baseDirectoryService.rename(sessionData, githubSessionData, {
      oldDirectoryName,
      newDirectoryName: newDirectoryPath,
      message: `Renaming resource category ${resourceCategoryName} to ${slugifiedNewResourceCategoryName}`,
    })
    await this.gitHubService.update(sessionData, {
      fileContent: newContent,
      sha,
      fileName: INDEX_FILE_NAME,
      directoryName: newDirectoryPath,
    })
  }

  async deleteResourceDirectory(
    sessionData,
    githubSessionData,
    { resourceRoomName, resourceCategoryName }
  ) {
    await this.baseDirectoryService.delete(sessionData, githubSessionData, {
      directoryName: this.getResourceDirectoryPath({
        resourceRoomName,
        resourceCategoryName,
      }),
      message: `Deleting resource category ${resourceCategoryName}`,
    })
  }

  async moveResourcePages(
    sessionData,
    githubSessionData,
    { resourceRoomName, resourceCategoryName, targetResourceCategory, objArray }
  ) {
    const targetFiles = objArray.map((item) => item.name)
    const oldDirectoryName = `${this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategoryName,
    })}/_posts`
    const newDirectoryName = `${this.getResourceDirectoryPath({
      resourceRoomName,
      resourceCategoryName: targetResourceCategory,
    })}/_posts`
    await this.baseDirectoryService.moveFiles(sessionData, githubSessionData, {
      oldDirectoryName,
      newDirectoryName,
      targetFiles,
      message: `Moving resource pages from ${resourceCategoryName} to ${targetResourceCategory}`,
    })
  }
}

module.exports = { ResourceDirectoryService }
