import { AxiosCacheInstance } from "axios-cache-interceptor"

import GithubSessionData from "@root/classes/GithubSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { STAGING_BRANCH, STAGING_LITE_BRANCH } from "@root/constants"
import { GitCommitResult } from "@root/types/gitfilesystem"
import isFileAsset from "@root/utils/commit-utils"
import { isReduceBuildTimesWhitelistedRepo } from "@root/utils/growthbook-utils"
import GitHubService from "@services/db/GitHubService"

/**
 * Responsibilities of this class
 * 1. Creates all commits to staging
 * 2. Creates non-asset related commits to staging-lite
 */
export default class GitHubCommitService extends GitHubService {
  constructor(axiosInstance: AxiosCacheInstance) {
    super({ axiosInstance })
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
  ): Promise<{
    sha: string
  }> {
    const resultToStaging = await super.create(sessionData, {
      content,
      fileName,
      directoryName,
      isMedia,
      branchName: STAGING_BRANCH,
    })

    const shouldStagingLiteUpdate =
      !isFileAsset({ directoryName, fileName }) &&
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook)

    if (shouldStagingLiteUpdate) {
      // We still await and throw error if the commit to staging-lite fails,
      // but the caller only gets the `resultToStaging` commit returned
      await super.create(sessionData, {
        content,
        directoryName,
        fileName,
        isMedia,
        branchName: STAGING_LITE_BRANCH,
      })
    }

    return resultToStaging
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
      directoryName: string | undefined
    }
  ): Promise<GitCommitResult> {
    const resultToStaging = await super.update(sessionData, {
      fileContent,
      sha,
      fileName,
      directoryName,
      branchName: STAGING_BRANCH,
    })

    const shouldStagingLiteUpdate =
      !isFileAsset({ directoryName, fileName }) &&
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook)

    if (shouldStagingLiteUpdate) {
      // We still await and throw error if the commit to staging-lite fails,
      // but the caller only gets the `resultToStaging` commit returned
      await super.update(sessionData, {
        fileContent,
        sha,
        fileName,
        directoryName,
        branchName: STAGING_LITE_BRANCH,
      })
    }

    return resultToStaging
  }

  async deleteDirectory(
    sessionData: UserWithSiteSessionData,
    {
      directoryName,
      message,
      githubSessionData,
      isStaging = true,
    }: {
      directoryName: string
      message: string
      githubSessionData: GithubSessionData
      isStaging?: boolean
    }
  ): Promise<void> {
    await super.deleteDirectory(sessionData, {
      directoryName,
      message,
      githubSessionData,
      isStaging,
    })

    if (
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ directoryName })
    ) {
      await this.deleteDirectory(sessionData, {
        directoryName,
        message,
        githubSessionData,
        isStaging: false,
      })
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
    await super.delete(sessionData, {
      sha,
      fileName,
      directoryName,
    })

    const shouldStagingLiteUpdate =
      !isFileAsset({ directoryName, fileName }) &&
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook)
    if (shouldStagingLiteUpdate) {
      await super.delete(sessionData, {
        sha,
        fileName,
        directoryName,
        branchName: STAGING_LITE_BRANCH,
      })
    }
  }

  async renameSinglePath(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    oldPath: string,
    newPath: string,
    message?: string,
    isStaging = true
  ): Promise<GitCommitResult> {
    const stagingRenameSinglePathResult = await super.renameSinglePath(
      sessionData,
      githubSessionData,
      oldPath,
      newPath,
      message,
      isStaging
    )

    const shouldStagingLiteUpdate =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ directoryName: oldPath })

    if (shouldStagingLiteUpdate) {
      // we await this call, but we do not need to return this result
      await super.renameSinglePath(
        sessionData,
        githubSessionData,
        oldPath,
        newPath,
        message,
        false
      )
    }

    return stagingRenameSinglePathResult
  }

  async moveFiles(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    oldPath: string,
    newPath: string,
    targetFiles: string[],
    message?: string,
    isStaging = true
  ): Promise<GitCommitResult> {
    const stagingMoveFilesResult = await super.moveFiles(
      sessionData,
      githubSessionData,
      oldPath,
      newPath,
      targetFiles,
      message,
      isStaging
    )

    const shouldUpdateStagingLite =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset({ directoryName: oldPath })
    if (shouldUpdateStagingLite) {
      // We don't have to return the sha, just update this should be ok
      await super.moveFiles(
        sessionData,
        githubSessionData,
        oldPath,
        newPath,
        targetFiles,
        message,
        false
      )
    }

    return stagingMoveFilesResult
  }
}
