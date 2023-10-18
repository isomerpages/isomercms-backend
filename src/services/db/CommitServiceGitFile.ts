import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { STAGING_BRANCH, STAGING_LITE_BRANCH } from "@root/constants"
import isFileAsset from "@root/utils/commit-utils"
import { isReduceBuildTimesWhitelistedRepo } from "@root/utils/growthbook-utils"

import GitFileSystemService from "./GitFileSystemService"

/**
 * Responsibilities of this class
 * 1. Creates all commits to staging
 * 2. Creates non-asset related commits to staging-lite
 */
export default class CommitServiceGitFile {
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
      !isFileAsset(directoryName)

    // todo check if directory name is works here
    if (shouldUpdateStagingLite) {
      createPromises.push(
        this.gitFileSystemService.create(
          sessionData.siteName,
          sessionData.isomerUserId,
          content,
          directoryName,
          fileName,
          isMedia ? "base64" : "utf-8",
          STAGING_LITE_BRANCH
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
      this.gitFileSystemService.push(sessionData.siteName, STAGING_LITE_BRANCH)
    }
    return { sha: stagingCreateResult.value.newSha }
  }
}
