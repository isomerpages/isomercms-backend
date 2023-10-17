import { AxiosCacheInstance } from "axios-cache-interceptor"

import GithubSessionData from "@root/classes/GithubSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { STAGING_BRANCH, STAGING_LITE_BRANCH } from "@root/constants"
import { ConflictError } from "@root/errors/ConflictError"
import { GitCommitResult } from "@root/types/gitfilesystem"
import { isReduceBuildTimesWhitelistedRepo } from "@root/utils/growthbook-utils"
import isFileAsset from "@services/db/CommitServiceGitFile"
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
        branchName: STAGING_BRANCH,
      }),
    ]
    const shouldStagingLiteUpdate =
      !isFileAsset(directoryName) &&
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook)

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [resultToStaging, _] = await Promise.all(createPromises)

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
    const updatePromises = [
      super.update(sessionData, {
        fileContent,
        sha,
        fileName,
        directoryName,
        branchName: STAGING_BRANCH,
      }),
    ]
    const shouldStagingLiteUpdate =
      directoryName &&
      !isFileAsset(directoryName) &&
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook)

    if (shouldStagingLiteUpdate) {
      updatePromises.push(
        super.update(sessionData, {
          fileContent,
          sha,
          fileName,
          directoryName,
          branchName: STAGING_LITE_BRANCH,
        })
      )
    }

    // We still await and throw error if the commit to staging-lite fails,
    // but the caller only gets the `resultToStaging` commit returned
    const [resultToStaging, _] = await Promise.all(updatePromises)

    return resultToStaging
  }

  async deleteDirectory(
    sessionData: UserWithSiteSessionData,
    {
      directoryName,
      message,
      githubSessionData,
      isStaging,
    }: {
      directoryName: string
      message: string
      githubSessionData: GithubSessionData
      isStaging?: boolean
    }
  ): Promise<void> {
    // GitHub flow
    const gitTree = await this.getTree(
      sessionData,
      githubSessionData,
      {
        isRecursive: true,
      },
      isStaging
    )

    // Retrieve removed items and set their sha to null
    const newGitTree = gitTree
      .filter(
        (item) =>
          item.path.startsWith(`${directoryName}/`) && item.type !== "tree"
      )
      .map((item) => ({
        ...item,
        sha: null,
      }))

    const newCommitSha = await this.updateTree(
      sessionData,
      githubSessionData,
      {
        gitTree: newGitTree,
        message,
      },
      !!isStaging
    )

    const deletePromises = [
      this.updateRepoState(sessionData, {
        commitSha: newCommitSha,
      }),
    ]

    if (
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset(directoryName)
    ) {
      deletePromises.push(
        this.deleteDirectory(sessionData, {
          directoryName,
          message,
          githubSessionData,
          isStaging: false,
        })
      )
    }
    await Promise.all(deletePromises)
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
    const deletePromises = [
      super.delete(sessionData, {
        sha,
        fileName,
        directoryName,
      }),
    ]
    const shouldStagingLiteUpdate =
      !isFileAsset(directoryName) &&
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook)
    if (shouldStagingLiteUpdate) {
      deletePromises.push(
        super.delete(sessionData, {
          sha,
          fileName,
          directoryName,
          branchName: STAGING_LITE_BRANCH,
        })
      )
    }

    await Promise.all(deletePromises)
  }

  async renameSinglePath(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    oldPath: string,
    newPath: string,
    message?: string,
    isStaging?: boolean
  ): Promise<GitCommitResult> {
    const gitTree = await super.getTree(
      sessionData,
      githubSessionData,
      {
        isRecursive: true,
      },
      !!isStaging
    )
    const newGitTree: any[] = []
    const isMovingDirectory =
      gitTree.find((item: any) => item.path === oldPath)?.type === "tree" ||
      false

    gitTree.forEach((item: any) => {
      if (isMovingDirectory) {
        if (item.path === newPath && item.type === "tree") {
          throw new ConflictError("Target directory already exists")
        } else if (item.path === oldPath && item.type === "tree") {
          // Rename old subdirectory to new name
          newGitTree.push({
            ...item,
            path: newPath,
          })
        } else if (
          item.path.startsWith(`${oldPath}/`) &&
          item.type !== "tree"
        ) {
          // Delete old files
          newGitTree.push({
            ...item,
            sha: null,
          })
        }
      } else if (item.path === newPath && item.type !== "tree") {
        throw new ConflictError("Target file already exists")
      } else if (item.path === oldPath && item.type !== "tree") {
        // Add file to new directory
        newGitTree.push({
          ...item,
          path: newPath,
        })
        // Delete old file
        newGitTree.push({
          ...item,
          sha: null,
        })
      }
    })

    const newCommitSha = await super.updateTree(
      sessionData,
      githubSessionData,
      {
        gitTree: newGitTree,
        message,
      },
      !!isStaging
    )
    await super.updateRepoState(sessionData, {
      commitSha: newCommitSha,
    })

    const shouldStagingLiteUpdate =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset(oldPath)

    if (shouldStagingLiteUpdate) {
      // we await this call, but we do not need to return this result
      await this.renameSinglePath(
        sessionData,
        githubSessionData,
        oldPath,
        newPath,
        message,
        false
      )
    }

    return { newSha: newCommitSha }
  }

  async moveFiles(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    oldPath: string,
    newPath: string,
    targetFiles: string[],
    message?: string,
    isStaging?: boolean
  ): Promise<GitCommitResult> {
    const gitTree = await super.getTree(
      sessionData,
      githubSessionData,
      {
        isRecursive: true,
      },
      isStaging
    )
    const newGitTree: any[] = []

    gitTree.forEach((item: any) => {
      if (item.path.startsWith(`${newPath}/`) && item.type !== "tree") {
        const fileName = item.path
          .split(`${newPath}/`)
          .slice(1)
          .join(`${newPath}/`)
        if (targetFiles.includes(fileName)) {
          // Conflicting file
          throw new ConflictError("File already exists in target directory")
        }
      }
      if (item.path.startsWith(`${oldPath}/`) && item.type !== "tree") {
        const fileName = item.path
          .split(`${oldPath}/`)
          .slice(1)
          .join(`${oldPath}/`)
        if (targetFiles.includes(fileName)) {
          // Add file to target directory
          newGitTree.push({
            ...item,
            path: `${newPath}/${fileName}`,
          })
          // Delete old file
          newGitTree.push({
            ...item,
            sha: null,
          })
        }
      }
    })

    const newCommitSha = await super.updateTree(
      sessionData,
      githubSessionData,
      {
        gitTree: newGitTree,
        message,
      },
      !!isStaging
    )

    await super.updateRepoState(sessionData, {
      commitSha: newCommitSha,
    })

    const shouldUpdateStagingLite =
      isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
      !isFileAsset(oldPath)
    if (shouldUpdateStagingLite) {
      // We don't have to return the sha, just update this should be ok
      await this.moveFiles(
        sessionData,
        githubSessionData,
        oldPath,
        newPath,
        targetFiles,
        message,
        false
      )
    }
    return { newSha: newCommitSha }
  }
}
