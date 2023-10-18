import { AxiosCacheInstance } from "axios-cache-interceptor"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { STAGING_LITE_BRANCH } from "@root/constants"
import isFileAsset from "@root/utils/commit-utils"
import { isReduceBuildTimesWhitelistedRepo } from "@root/utils/growthbook-utils"
import GitHubService from "@services/db/GitHubService"

/**
 * Responsibilities of this class
 * 1. Creates all commits to staging
 * 2. Creates non-asset related commits to staging-lite
 */
export default class CommitServiceGitHub extends GitHubService {
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
    const createPromises = [
      super.create(sessionData, {
        content,
        fileName,
        directoryName,
        isMedia,
      }),
    ]
    const shouldStagingLiteUpdate =
      !isFileAsset(directoryName) &&
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook)

    // todo check if directory name is works here
    if (shouldStagingLiteUpdate) {
      createPromises.push(
        super.create(sessionData, {
          content,
          directoryName,
          fileName,
          isMedia,
          branchName: STAGING_LITE_BRANCH,
        })
      )
    }

    // We still await and throw error if the commit to staging-lite fails,
    // but the caller only gets the `resultToStaging` commit returned
    const [resultToStaging, _] = await Promise.all(createPromises)

    return resultToStaging
  }
}
