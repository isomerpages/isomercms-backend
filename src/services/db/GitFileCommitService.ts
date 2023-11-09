import GithubSessionData from "@root/classes/GithubSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { STAGING_BRANCH, STAGING_LITE_BRANCH } from "@root/constants"
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
  private readonly gitFileSystemService: GitFileSystemService

  constructor(gitFileSystemService: GitFileSystemService) {
    this.gitFileSystemService = gitFileSystemService
  }

  async pushToGithub(
    sessionData: UserWithSiteSessionData,
    shouldUpdateStagingLite: boolean
  ) {
    // We await the push to staging FIRST, and then push to staging-lite
    // We don't want a case when staging lite updates but staging doesn't
    await this.gitFileSystemService.push(sessionData.siteName, STAGING_BRANCH)
    if (shouldUpdateStagingLite) {
      await this.gitFileSystemService.push(
        sessionData.siteName,
        STAGING_LITE_BRANCH
      )
    }
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
    const stagingCreateResult = await this.gitFileSystemService.create(
      sessionData.siteName,
      sessionData.isomerUserId,
      content,
      directoryName,
      fileName,
      isMedia ? "base64" : "utf-8",
      STAGING_BRANCH
    )
    const shouldUpdateStagingLite =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ directoryName, fileName })

    let stagingLiteCreateResult
    if (shouldUpdateStagingLite) {
      stagingLiteCreateResult = await this.gitFileSystemService.create(
        sessionData.siteName,
        sessionData.isomerUserId,
        content,
        directoryName,
        fileName,
        isMedia ? "base64" : "utf-8",
        STAGING_LITE_BRANCH
      )
    }

    if (stagingCreateResult.isErr()) {
      throw stagingCreateResult.error
    } else if (
      shouldUpdateStagingLite &&
      stagingLiteCreateResult &&
      stagingLiteCreateResult.isErr()
    ) {
      throw stagingLiteCreateResult.error
    }

    this.pushToGithub(sessionData, shouldUpdateStagingLite)
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
    const stagingUpdateResult = await this.gitFileSystemService.update(
      sessionData.siteName,
      filePath,
      fileContent,
      sha,
      sessionData.isomerUserId,
      defaultBranch
    )

    const shouldUpdateStagingLite =
      !!filePath &&
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ fileName, directoryName })

    let stagingLiteUpdateResult
    if (shouldUpdateStagingLite) {
      stagingLiteUpdateResult = await this.gitFileSystemService.update(
        sessionData.siteName,
        filePath,
        fileContent,
        sha,
        sessionData.isomerUserId,
        STAGING_LITE_BRANCH
      )
    }

    if (stagingUpdateResult.isErr()) {
      throw stagingUpdateResult.error
    } else if (
      shouldUpdateStagingLite &&
      stagingLiteUpdateResult &&
      stagingLiteUpdateResult.isErr()
    ) {
      throw stagingLiteUpdateResult.error
    }

    this.pushToGithub(sessionData, shouldUpdateStagingLite)
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
    const stagingDeleteResult = await this.gitFileSystemService.delete(
      sessionData.siteName,
      directoryName,
      "",
      sessionData.isomerUserId,
      true,
      STAGING_BRANCH
    )

    const shouldUpdateStagingLite =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ directoryName })
    let stagingLiteDeleteResult
    if (shouldUpdateStagingLite) {
      stagingLiteDeleteResult = await this.gitFileSystemService.delete(
        sessionData.siteName,
        directoryName,
        "",
        sessionData.isomerUserId,
        true,
        STAGING_LITE_BRANCH
      )
    }

    if (stagingDeleteResult.isErr()) {
      throw stagingDeleteResult.error
    } else if (
      shouldUpdateStagingLite &&
      stagingLiteDeleteResult &&
      stagingLiteDeleteResult.isErr()
    ) {
      throw stagingLiteDeleteResult.error
    }

    this.pushToGithub(sessionData, shouldUpdateStagingLite)
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

    const filePath = directoryName ? `${directoryName}/${fileName}` : fileName

    const stagingDeleteResult = await this.gitFileSystemService.delete(
      sessionData.siteName,
      filePath,
      sha,
      sessionData.isomerUserId,
      false,
      STAGING_BRANCH
    )

    const shouldUpdateStagingLite =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ directoryName })

    let stagingLiteDeleteResult
    if (shouldUpdateStagingLite) {
      stagingLiteDeleteResult = await this.gitFileSystemService.delete(
        sessionData.siteName,
        filePath,
        sha,
        sessionData.isomerUserId,
        false,
        STAGING_LITE_BRANCH
      )
    }

    if (stagingDeleteResult.isErr()) {
      throw stagingDeleteResult.error
    } else if (
      shouldUpdateStagingLite &&
      stagingLiteDeleteResult &&
      stagingLiteDeleteResult.isErr()
    ) {
      throw stagingLiteDeleteResult.error
    }

    this.pushToGithub(sessionData, shouldUpdateStagingLite)
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

    const stagingRenameResult = await this.gitFileSystemService.renameSinglePath(
      sessionData.siteName,
      oldPath,
      newPath,
      sessionData.isomerUserId,
      defaultBranch,
      message
    )

    if (stagingRenameResult.isErr()) {
      throw stagingRenameResult.error
    }

    const shouldUpdateStagingLite =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ directoryName: oldPath })

    if (shouldUpdateStagingLite) {
      const stagingLiteRenameResult = await this.gitFileSystemService.renameSinglePath(
        sessionData.siteName,
        oldPath,
        newPath,
        sessionData.isomerUserId,
        STAGING_LITE_BRANCH,
        message
      )
      if (stagingLiteRenameResult.isErr()) {
        throw stagingLiteRenameResult.error
      }
    }

    this.pushToGithub(sessionData, shouldUpdateStagingLite)
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
    const stagingMvFilesResult = await this.gitFileSystemService.moveFiles(
      sessionData.siteName,
      oldPath,
      newPath,
      sessionData.isomerUserId,
      targetFiles,
      defaultBranch,
      message
    )
    if (stagingMvFilesResult.isErr()) {
      throw stagingMvFilesResult.error
    }

    const shouldUpdateStagingLite =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ directoryName: oldPath })

    if (shouldUpdateStagingLite) {
      const stagingLiteMvFilesResult = await this.gitFileSystemService.moveFiles(
        sessionData.siteName,
        oldPath,
        newPath,
        sessionData.isomerUserId,
        targetFiles,
        STAGING_LITE_BRANCH,
        message
      )
      if (stagingLiteMvFilesResult.isErr()) {
        throw stagingLiteMvFilesResult.error
      }
    }

    this.pushToGithub(sessionData, shouldUpdateStagingLite)
    return { newSha: stagingMvFilesResult.value }
  }
}
