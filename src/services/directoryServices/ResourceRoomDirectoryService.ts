import { BadRequestError } from "@errors/BadRequestError"

import {
  convertDataToMarkdown,
  retrieveDataFromMarkdown,
} from "@utils/markdown-utils"
import { slugifyCollectionName } from "@utils/utils"

import GithubSessionData from "@root/classes/GithubSessionData"
import UserSessionData from "@root/classes/UserSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { ConflictError } from "@root/errors/ConflictError"
import { GitDirectoryItem } from "@root/types/gitfilesystem"
import GitHubService from "@services/db/GitHubService"
import { BaseDirectoryService } from "@services/directoryServices/BaseDirectoryService"
import { ConfigYmlService } from "@services/fileServices/YmlFileServices/ConfigYmlService"

const INDEX_FILE_NAME = "index.html"

interface ConfigContent {
  "facebook-pixel": string
  resources_name?: string
}

export class ResourceRoomDirectoryService {
  private baseDirectoryService: BaseDirectoryService

  private configYmlService: ConfigYmlService

  private gitHubService: GitHubService

  constructor({
    baseDirectoryService,
    configYmlService,
    gitHubService,
  }: {
    baseDirectoryService: BaseDirectoryService
    configYmlService: ConfigYmlService
    gitHubService: GitHubService
  }) {
    this.baseDirectoryService = baseDirectoryService
    this.configYmlService = configYmlService
    this.gitHubService = gitHubService
  }

  async listAllResourceCategories(
    sessionData: UserWithSiteSessionData,
    { resourceRoomName }: { resourceRoomName: string }
  ): Promise<GitDirectoryItem[]> {
    const filesOrDirs = await this.baseDirectoryService.list(sessionData, {
      directoryName: resourceRoomName,
    })
    return filesOrDirs.reduce(
      (acc: GitDirectoryItem[], curr: GitDirectoryItem) => {
        if (curr.type === "dir") {
          acc.push({
            name: curr.name,
            type: "dir",
            path: "",
            size: 0,
            addedTime: 0,
          })
        }
        return acc
      },
      []
    )
  }

  async getResourceRoomDirectoryName(
    sessionData: UserSessionData
  ): Promise<{ resourceRoomName: string | null }> {
    const config: { content: ConfigContent } = await this.configYmlService.read(
      sessionData
    )
    return {
      resourceRoomName: config.content.resources_name
        ? config.content.resources_name
        : null,
    }
  }

  async createResourceRoomDirectory(
    sessionData: UserWithSiteSessionData,
    { resourceRoomName }: { resourceRoomName: string }
  ): Promise<{ newDirectoryName: string }> {
    if (/[^a-zA-Z0-9- ]/g.test(resourceRoomName)) {
      throw new BadRequestError(
        "Special characters not allowed in resource room name"
      )
    }
    const slugifiedResourceRoomName = slugifyCollectionName(resourceRoomName)
    const { content: configContent, sha } = (await this.configYmlService.read(
      sessionData
    )) as { content: ConfigContent; sha: string }

    if ("resources_name" in configContent && configContent.resources_name) {
      throw new ConflictError("Resource room already exists")
    }
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
      isMedia: false,
    })
    return {
      newDirectoryName: slugifiedResourceRoomName,
    }
  }

  async renameResourceRoomDirectory(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    {
      resourceRoomName,
      newDirectoryName,
    }: { resourceRoomName: string; newDirectoryName: string }
  ): Promise<{ newDirectoryName: string }> {
    if (/[^a-zA-Z0-9- ]/g.test(newDirectoryName)) {
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
    } = (await this.configYmlService.read(sessionData)) as {
      content: ConfigContent
      sha: string
    }
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
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    { resourceRoomName }: { resourceRoomName: string }
  ): Promise<void> {
    await this.baseDirectoryService.delete(sessionData, githubSessionData, {
      directoryName: resourceRoomName,
      message: `Deleting resource room ${resourceRoomName}`,
    })
    const { content: configContent, sha } = (await this.configYmlService.read(
      sessionData
    )) as { content: ConfigContent; sha: string }
    delete configContent.resources_name
    await this.configYmlService.update(sessionData, {
      fileContent: configContent,
      sha,
    })
  }
}

module.exports = { ResourceRoomDirectoryService }
