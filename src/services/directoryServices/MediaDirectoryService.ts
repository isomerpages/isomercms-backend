import { BadRequestError } from "@errors/BadRequestError"

import { isMediaPathValid } from "@validators/validators"

import GithubSessionData from "@root/classes/GithubSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { GitDirectoryItem } from "@root/types/gitfilesystem"
import { MediaDirOutput, MediaFileOutput } from "@root/types/media"
import RepoService from "@services/db/RepoService"
import BaseDirectoryService from "@services/directoryServices/BaseDirectoryService"

const PLACEHOLDER_FILE_NAME = ".keep"

class MediaDirectoryService {
  private baseDirectoryService: BaseDirectoryService

  private repoService: RepoService

  constructor({
    baseDirectoryService,
    repoService,
  }: {
    baseDirectoryService: BaseDirectoryService
    repoService: RepoService
  }) {
    this.baseDirectoryService = baseDirectoryService
    this.repoService = repoService
  }

  async listWithDefault(
    sessionData: UserWithSiteSessionData,
    { directoryName }: { directoryName: string }
  ): Promise<GitDirectoryItem[]> {
    let files: GitDirectoryItem[] = []
    try {
      const retrievedFiles = await this.baseDirectoryService.list(sessionData, {
        directoryName,
      })
      files = retrievedFiles
    } catch (error: any) {
      if (error.status !== 404) throw error
    }
    return files
  }

  async listMediaDirectoryContent(
    sessionData: UserWithSiteSessionData,
    {
      directoryName,
      page,
      limit,
      search,
    }: { directoryName: string; page: number; limit: number; search: string }
  ): Promise<{
    directories: MediaDirOutput[]
    files: Pick<MediaFileOutput, "name">[]
    total: number
  }> {
    if (!isMediaPathValid({ path: directoryName })) {
      throw new BadRequestError("Invalid media folder name")
    }

    return this.repoService.readMediaDirectory(
      sessionData,
      directoryName,
      page,
      limit,
      search
    )
  }

  async createMediaDirectory(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    { directoryName, objArray }: { directoryName: string; objArray: any[] }
  ): Promise<{ newDirectoryName: string }> {
    if (!isMediaPathValid({ path: directoryName })) {
      throw new BadRequestError(
        "Special characters not allowed in media folder name"
      )
    }

    if (directoryName === "images" || directoryName === "files") {
      throw new BadRequestError("Cannot create root media directory")
    }

    if (objArray && objArray.length !== 0) {
      const pathTokens = directoryName.split("/")
      const oldDirectoryName = pathTokens.slice(0, -1).join("/")
      const targetFiles = objArray.map((file) => file.name)

      await this.baseDirectoryService.moveFiles(
        sessionData,
        githubSessionData,
        {
          oldDirectoryName,
          newDirectoryName: directoryName,
          targetFiles,
          message: `Moving media files from ${oldDirectoryName} to ${directoryName}`,
        }
      )
    }

    await this.repoService.create(sessionData, {
      content: "",
      fileName: PLACEHOLDER_FILE_NAME,
      directoryName,
    })

    return { newDirectoryName: directoryName }
  }

  async renameMediaDirectory(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    {
      directoryName,
      newDirectoryName,
    }: { directoryName: string; newDirectoryName: string }
  ): Promise<void> {
    if (!isMediaPathValid({ path: newDirectoryName })) {
      throw new BadRequestError(
        "Special characters not allowed in media folder name"
      )
    }

    await this.baseDirectoryService.rename(sessionData, githubSessionData, {
      oldDirectoryName: directoryName,
      newDirectoryName,
      message: `Renaming media folder ${directoryName} to ${newDirectoryName}`,
    })
  }

  async deleteMediaDirectory(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    { directoryName }: { directoryName: string }
  ): Promise<void> {
    if (!isMediaPathValid({ path: directoryName })) {
      throw new BadRequestError("Invalid media folder name")
    }

    await this.baseDirectoryService.delete(sessionData, githubSessionData, {
      directoryName,
      message: `Deleting media folder ${directoryName}`,
    })
  }

  async moveMediaFiles(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    {
      directoryName,
      targetDirectoryName,
      objArray,
    }: { directoryName: string; targetDirectoryName: string; objArray: any[] }
  ): Promise<void> {
    if (
      !isMediaPathValid({ path: directoryName }) ||
      !isMediaPathValid({ path: targetDirectoryName })
    ) {
      throw new BadRequestError(
        "Special characters not allowed in media folder name"
      )
    }

    const targetFiles = objArray.map((item) => item.name)

    await this.baseDirectoryService.moveFiles(sessionData, githubSessionData, {
      oldDirectoryName: directoryName,
      newDirectoryName: targetDirectoryName,
      targetFiles,
      message: `Moving media files from ${directoryName} to ${targetDirectoryName}`,
    })
  }
}

export default MediaDirectoryService
