import _ from "lodash"

import GithubSessionData from "@root/classes/GithubSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { GitDirectoryItem } from "@root/types/gitfilesystem"
import RepoService from "@services/db/RepoService"

interface DirectoryOperationOptions {
  directoryName?: string
  message?: string
  oldDirectoryName?: string
  newDirectoryName?: string
  targetFiles?: string[]
}

export class BaseDirectoryService {
  private repoService: RepoService

  constructor(repoService: RepoService) {
    this.repoService = repoService
  }

  async list(
    sessionData: UserWithSiteSessionData,
    options: DirectoryOperationOptions
  ): Promise<GitDirectoryItem[]> {
    const directoryData = await this.repoService.readDirectory(sessionData, {
      directoryName: options.directoryName || "", // Provide a default value for directoryName
    })

    const filesOrDirs = directoryData.map((fileOrDir: GitDirectoryItem) => {
      const { name, path, sha, size, type, addedTime } = fileOrDir
      return {
        name,
        path,
        sha,
        size,
        type,
        addedTime,
      }
    })

    return _.compact(filesOrDirs)
  }

  async delete(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    options: DirectoryOperationOptions
  ): Promise<void> {
    const message = options.message || "" // Provide a default value for message
    const directoryName = options.directoryName || "" // Provide a default value for directoryName
    await this.repoService.deleteDirectory(sessionData, {
      directoryName,
      message,
      githubSessionData,
    })
  }

  async rename(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    options: DirectoryOperationOptions
  ): Promise<void> {
    await this.repoService.renameSinglePath(
      sessionData,
      githubSessionData,
      options.oldDirectoryName || "", // Add a default value of an empty string
      options.newDirectoryName || "", // Add a default value of an empty string
      options.message
    )
  }

  async moveFiles(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    options: DirectoryOperationOptions
  ): Promise<void> {
    await this.repoService.moveFiles(
      sessionData,
      githubSessionData,
      options.oldDirectoryName || "", // Add a default value of an empty string
      options.newDirectoryName || "", // Add a default value of an empty string
      options.targetFiles || [], // Add a default value of an empty array
      options.message
    )
  }
}

module.exports = { BaseDirectoryService }
