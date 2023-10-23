import GithubSessionData from "@root/classes/GithubSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { STAGING_BRANCH } from "@root/constants"
import logger from "@root/logger/logger"
import { GitCommitResult } from "@root/types/gitfilesystem"
import isFileAsset from "@root/utils/commit-utils"
import { isReduceBuildTimesWhitelistedRepo } from "@root/utils/growthbook-utils"

import GitFileSystemService from "./GitFileSystemService"

/**
 * Responsibilities of this class
 * 1. Creates all commits to staging
 * 2. Creates non-asset related commits to staging-lite
 */
export default class GitFileCommitService {
  private readonly STAGING_LITE_BRANCH = "staging-lite"

  private readonly gitFileSystemService: GitFileSystemService

  constructor(gitFileSystemService: GitFileSystemService) {
    this.gitFileSystemService = gitFileSystemService
  }

  async create(
    sessionData: UserWithSiteSessionData,
    {
      content,
      fileName,
      directoryName,
      isMedia = false,
    }: {
      content: string
      fileName: string
      directoryName: string
      isMedia?: boolean
    }
  ): Promise<{ sha: string }> {
    const createPromises = [
      this.gitFileSystemService.create(
        sessionData.siteName,
        sessionData.isomerUserId,
        content,
        directoryName,
        fileName,
        isMedia ? "base64" : "utf-8",
        STAGING_BRANCH
      ),
    ]
    const shouldUpdateStagingLite =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ directoryName, fileName })

    if (shouldUpdateStagingLite) {
      createPromises.push(
        this.gitFileSystemService.create(
          sessionData.siteName,
          sessionData.isomerUserId,
          content,
          directoryName,
          fileName,
          isMedia ? "base64" : "utf-8",
          this.STAGING_LITE_BRANCH
        )
      )
    }
    const [stagingCreateResult, stagingLiteCreateResult] = await Promise.all(
      createPromises
    )

    if (stagingCreateResult.isErr()) {
      throw stagingCreateResult.error
    } else if (shouldUpdateStagingLite && stagingLiteCreateResult.isErr()) {
      throw stagingLiteCreateResult.error
    }

    this.gitFileSystemService.push(sessionData.siteName, STAGING_BRANCH)
    if (shouldUpdateStagingLite) {
      this.gitFileSystemService.push(
        sessionData.siteName,
        this.STAGING_LITE_BRANCH
      )
    }
    return { sha: stagingCreateResult.value.newSha }
  }

  async update(
    sessionData: UserWithSiteSessionData,
    {
      fileContent,
      sha,
      fileName,
      directoryName,
    }: {
      fileContent: string
      sha: string
      fileName: string
      directoryName?: string
    }
  ): Promise<GitCommitResult> {
    const defaultBranch = STAGING_BRANCH
    logger.info("Updating file in local Git file system")
    const filePath = directoryName ? `${directoryName}/${fileName}` : fileName
    const updatePromises = [
      this.gitFileSystemService.update(
        sessionData.siteName,
        filePath,
        fileContent,
        sha,
        sessionData.isomerUserId,
        defaultBranch
      ),
    ]

    const shouldUpdateStagingLite =
      filePath &&
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ fileName, directoryName })

    if (shouldUpdateStagingLite) {
      updatePromises.push(
        this.gitFileSystemService.update(
          sessionData.siteName,
          filePath,
          fileContent,
          sha,
          sessionData.isomerUserId,
          this.STAGING_LITE_BRANCH
        )
      )
    }

    const results = await Promise.all(updatePromises)
    const [stagingUpdateResult, stagingLiteUpdateResult] = results

    if (stagingUpdateResult.isErr()) {
      throw stagingUpdateResult.error
    } else if (shouldUpdateStagingLite && stagingLiteUpdateResult.isErr()) {
      throw stagingLiteUpdateResult.error
    }

    this.gitFileSystemService.push(sessionData.siteName, defaultBranch)
    if (shouldUpdateStagingLite) {
      this.gitFileSystemService.push(
        sessionData.siteName,
        this.STAGING_LITE_BRANCH
      )
    }
    return { newSha: stagingUpdateResult.value }
  }

  async deleteDirectory(
    sessionData: UserWithSiteSessionData,
    {
      directoryName,
    }: {
      directoryName: string
    }
  ): Promise<void> {
    const defaultBranch = STAGING_BRANCH
    logger.info(
      `Deleting directory in local Git file system for repo: ${sessionData.siteName}, directory name: ${directoryName}`
    )
    const deletePromises = [
      this.gitFileSystemService.delete(
        sessionData.siteName,
        directoryName,
        "",
        sessionData.isomerUserId,
        true,
        STAGING_BRANCH
      ),
    ]

    const shouldUpdateStagingLite =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ directoryName })

    if (shouldUpdateStagingLite) {
      deletePromises.push(
        this.gitFileSystemService.delete(
          sessionData.siteName,
          directoryName,
          "",
          sessionData.isomerUserId,
          true,
          this.STAGING_LITE_BRANCH
        )
      )
    }

    const results = await Promise.all(deletePromises)
    const [stagingDeleteResult, stagingLiteDeleteResult] = results

    if (stagingDeleteResult.isErr()) {
      throw stagingDeleteResult.error
    } else if (shouldUpdateStagingLite && stagingLiteDeleteResult.isErr()) {
      throw stagingLiteDeleteResult.error
    }

    this.gitFileSystemService.push(sessionData.siteName, defaultBranch)
    if (shouldUpdateStagingLite) {
      this.gitFileSystemService.push(
        sessionData.siteName,
        this.STAGING_LITE_BRANCH
      )
    }
  }

  async delete(
    sessionData: UserWithSiteSessionData,
    {
      sha,
      fileName,
      directoryName,
    }: {
      sha: string
      fileName: string
      directoryName: string
    }
  ): Promise<void> {
    logger.info(
      `Deleting file in local Git file system for repo: ${sessionData.siteName}, directory name: ${directoryName}, file name: ${fileName}`
    )
    const defaultBranch = STAGING_BRANCH

    const filePath = directoryName ? `${directoryName}/${fileName}` : fileName

    const deletePromises = [
      this.gitFileSystemService.delete(
        sessionData.siteName,
        filePath,
        sha,
        sessionData.isomerUserId,
        false,
        STAGING_BRANCH
      ),
    ]

    const shouldUpdateStagingLite =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ directoryName })

    if (shouldUpdateStagingLite) {
      deletePromises.push(
        this.gitFileSystemService.delete(
          sessionData.siteName,
          filePath,
          sha,
          sessionData.isomerUserId,
          false,
          this.STAGING_LITE_BRANCH
        )
      )
    }

    const [stagingDeleteResult, stagingLiteDeleteResult] = await Promise.all(
      deletePromises
    )

    if (stagingDeleteResult.isErr()) {
      throw stagingDeleteResult.error
    } else if (shouldUpdateStagingLite && stagingLiteDeleteResult.isErr()) {
      throw stagingLiteDeleteResult.error
    }

    this.gitFileSystemService.push(sessionData.siteName, defaultBranch)
    if (shouldUpdateStagingLite) {
      this.gitFileSystemService.push(
        sessionData.siteName,
        this.STAGING_LITE_BRANCH
      )
    }
  }

  async renameSinglePath(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    oldPath: string,
    newPath: string,
    message?: string
  ): Promise<GitCommitResult> {
    const defaultBranch = STAGING_BRANCH
    logger.info("Renaming file/directory in local Git file system")

    const renamePromises = [
      this.gitFileSystemService.renameSinglePath(
        sessionData.siteName,
        oldPath,
        newPath,
        sessionData.isomerUserId,
        defaultBranch,
        message
      ),
    ]

    const shouldUpdateStagingLite =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ directoryName: oldPath })

    if (shouldUpdateStagingLite) {
      renamePromises.push(
        this.gitFileSystemService.renameSinglePath(
          sessionData.siteName,
          oldPath,
          newPath,
          sessionData.isomerUserId,
          this.STAGING_LITE_BRANCH,
          message
        )
      )
    }

    const results = await Promise.all(renamePromises)
    const [stagingRenameResult, stagingLiteRenameResult] = results

    if (stagingRenameResult.isErr()) {
      throw stagingRenameResult.error
    } else if (shouldUpdateStagingLite && stagingLiteRenameResult.isErr()) {
      throw stagingLiteRenameResult.error
    }

    this.gitFileSystemService.push(sessionData.siteName, defaultBranch)
    if (shouldUpdateStagingLite) {
      this.gitFileSystemService.push(
        sessionData.siteName,
        this.STAGING_LITE_BRANCH
      )
    }
    return { newSha: stagingRenameResult.value }
  }

  async moveFiles(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    oldPath: string,
    newPath: string,
    targetFiles: string[],
    message?: string
  ): Promise<GitCommitResult> {
    logger.info("Moving files in local Git file system")
    const defaultBranch = STAGING_BRANCH
    const mvFilesResults = [
      this.gitFileSystemService.moveFiles(
        sessionData.siteName,
        oldPath,
        newPath,
        sessionData.isomerUserId,
        targetFiles,
        defaultBranch,
        message
      ),
    ]
    const shouldUpdateStagingLite =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ directoryName: oldPath })

    if (shouldUpdateStagingLite) {
      mvFilesResults.push(
        this.gitFileSystemService.moveFiles(
          sessionData.siteName,
          oldPath,
          newPath,
          sessionData.isomerUserId,
          targetFiles,
          this.STAGING_LITE_BRANCH,
          message
        )
      )
    }

    const results = await Promise.all(mvFilesResults)
    const [stagingMvFilesResult, stagingLiteMvFilesResult] = results

    if (stagingMvFilesResult.isErr()) {
      throw stagingMvFilesResult.error
    } else if (shouldUpdateStagingLite && stagingLiteMvFilesResult.isErr()) {
      throw stagingLiteMvFilesResult.error
    }

    this.gitFileSystemService.push(sessionData.siteName, defaultBranch)
    if (shouldUpdateStagingLite) {
      this.gitFileSystemService.push(
        sessionData.siteName,
        this.STAGING_LITE_BRANCH
      )
    }
    return { newSha: stagingMvFilesResult.value }
  }
}
