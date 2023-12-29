import { BadRequestError } from "@errors/BadRequestError"
import { NotFoundError } from "@errors/NotFoundError"

import {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} from "@utils/markdown-utils"
import { slugifyCollectionName } from "@utils/utils"

import GithubSessionData from "@root/classes/GithubSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { GitDirectoryItem, GitFileItem } from "@root/types/gitfilesystem"
import GitHubService from "@services/db/GitHubService"
import BaseDirectoryService from "@services/directoryServices/BaseDirectoryService"

const INDEX_FILE_NAME = "index.html"

class ResourceDirectoryService {
  private baseDirectoryService: BaseDirectoryService

  private gitHubService: GitHubService

  constructor({
    baseDirectoryService,
    gitHubService,
  }: {
    baseDirectoryService: BaseDirectoryService
    gitHubService: GitHubService
  }) {
    this.baseDirectoryService = baseDirectoryService
    this.gitHubService = gitHubService
  }

  getResourceDirectoryPath({
    resourceRoomName,
    resourceCategoryName,
  }: {
    resourceRoomName: string
    resourceCategoryName: string
  }): string {
    return `${resourceRoomName}/${resourceCategoryName}`
  }

  async listFiles(
    sessionData: UserWithSiteSessionData,
    {
      resourceRoomName,
      resourceCategoryName,
    }: { resourceRoomName: string; resourceCategoryName: string }
  ): Promise<GitFileItem[]> {
    const resourceCategories = await this.baseDirectoryService.list(
      sessionData,
      { directoryName: resourceRoomName }
    )
    if (
      !resourceCategories.find(
        (element) => element.name === resourceCategoryName
      )
    ) {
      throw new NotFoundError("Resource category does not exist")
    }

    let files: GitDirectoryItem[] = []
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

    return files
      .map((curr: GitDirectoryItem): GitFileItem | undefined => {
        if (curr.type === "file") {
          const fileName = curr.name
          const fileNameArray = fileName.split(".md")[0]
          const tokenArray = fileNameArray.split("-")
          const date = tokenArray.slice(0, 3).join("-")
          const resourceType = ["file", "post", "link"].includes(tokenArray[3])
            ? tokenArray[3]
            : undefined
          const titleTokenArray = resourceType
            ? tokenArray.slice(4)
            : tokenArray.slice(3)
          const prettifiedTitleTokenArray = titleTokenArray.map(
            (token: string) => token.charAt(0).toUpperCase() + token.slice(1)
          )
          const title = prettifiedTitleTokenArray.join(" ")

          return { name: curr.name, type: "file", title, date, resourceType }
        }
        return undefined
      })
      .filter((file): file is GitFileItem => file !== undefined)
  }

  async createResourceDirectory(
    sessionData: UserWithSiteSessionData,
    {
      resourceRoomName,
      resourceCategoryName,
    }: { resourceRoomName: string; resourceCategoryName: string }
  ): Promise<{ newDirectoryName: string }> {
    if (/[^a-zA-Z0-9- ]/g.test(resourceCategoryName)) {
      throw new BadRequestError(
        "Special characters not allowed in resource category name"
      )
    }
    const slugifiedResourceCategoryName = slugifyCollectionName(
      resourceCategoryName
    )
    const frontMatter = { layout: "resources-alt", title: resourceCategoryName }
    const newContent = convertDataToMarkdown(frontMatter, "")
    await this.gitHubService.create(sessionData, {
      content: newContent,
      fileName: INDEX_FILE_NAME,
      directoryName: this.getResourceDirectoryPath({
        resourceRoomName,
        resourceCategoryName: slugifiedResourceCategoryName,
      }),
      isMedia: false,
    })

    return { newDirectoryName: slugifiedResourceCategoryName }
  }

  async renameResourceDirectory(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    {
      resourceRoomName,
      resourceCategoryName,
      newDirectoryName,
    }: {
      resourceRoomName: string
      resourceCategoryName: string
      newDirectoryName: string
    }
  ): Promise<void> {
    if (/[^a-zA-Z0-9- ]/g.test(newDirectoryName)) {
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
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    {
      resourceRoomName,
      resourceCategoryName,
    }: { resourceRoomName: string; resourceCategoryName: string }
  ): Promise<void> {
    await this.baseDirectoryService.delete(sessionData, githubSessionData, {
      directoryName: this.getResourceDirectoryPath({
        resourceRoomName,
        resourceCategoryName,
      }),
      message: `Deleting resource category ${resourceCategoryName}`,
    })
  }

  async moveResourcePages(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    {
      resourceRoomName,
      resourceCategoryName,
      targetResourceCategory,
      objArray,
    }: {
      resourceRoomName: string
      resourceCategoryName: string
      targetResourceCategory: string
      objArray: any[]
    }
  ): Promise<void> {
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

export default ResourceDirectoryService
