import { GrowthBook } from "@growthbook/growthbook"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { FEATURE_FLAGS } from "@root/constants"
import { FeatureFlags } from "@root/types/featureFlags"
import { isReduceBuildTimesWhitelistedRepo } from "@root/utils/growthbook-utils"

import GitFileSystemService from "./GitFileSystemService"
import GitHubService, { STAGING_BRANCH } from "./GitHubService"

export function isFileAsset(path: string) {
  return path.includes("images/") || path.includes("files/")
}

/**
 * Responsibilities of this class
 * 1. Creates all commits to staging
 * 2. Creates non-asset related commits to staging-lite
 */
export default class CommitServiceGitFile {
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
  ) {
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
    const shouldStagingLiteUpdate =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset(directoryName)

    // todo check if directory name is works here
    if (shouldStagingLiteUpdate) {
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
    const [resultToStaging, resultToStagingLite] = await Promise.all(
      createPromises
    )

    if (resultToStaging.isErr()) {
      throw resultToStaging.error
    } else if (shouldStagingLiteUpdate && resultToStagingLite.isErr()) {
      throw resultToStagingLite.error
    }

    this.gitFileSystemService.push(sessionData.siteName, STAGING_BRANCH)
    if (shouldStagingLiteUpdate) {
      this.gitFileSystemService.push(
        sessionData.siteName,
        this.STAGING_LITE_BRANCH
      )
    }
    return { sha: resultToStaging.value.newSha }
  }
}
