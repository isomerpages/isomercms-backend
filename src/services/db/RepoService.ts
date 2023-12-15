import { AxiosCacheInstance } from "axios-cache-interceptor"
import _ from "lodash"

import config from "@config/config"

import logger from "@logger/logger"

import GithubSessionData from "@root/classes/GithubSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { FEATURE_FLAGS, STAGING_BRANCH } from "@root/constants"
import { GitHubCommitData } from "@root/types/commitData"
import type {
  DirectoryContents,
  GitCommitResult,
  GitDirectoryItem,
  GitFile,
} from "@root/types/gitfilesystem"
import { RawGitTreeEntry } from "@root/types/github"
import { MediaDirOutput, MediaFileOutput, MediaType } from "@root/types/media"
import { getPaginatedDirectoryContents } from "@root/utils/files"
import { getMediaFileInfo } from "@root/utils/media-utils"

import GitFileCommitService from "./GitFileCommitService"
import GitFileSystemService from "./GitFileSystemService"
import GitHubService from "./GitHubService"
import * as ReviewApi from "./review"

const BRANCH_REF = config.get("github.branchRef")

// TODO: update the typings here to remove `any`.
// We can type as `unknown` if required.

interface RepoServiceParams {
  isomerRepoAxiosInstance: AxiosCacheInstance
  gitFileSystemService: GitFileSystemService
  gitFileCommitService: GitFileCommitService
}

export default class RepoService extends GitHubService {
  private readonly gitFileSystemService: GitFileSystemService

  private readonly gitFileCommitService: GitFileCommitService

  constructor({
    isomerRepoAxiosInstance,
    gitFileSystemService,
    gitFileCommitService,
  }: RepoServiceParams) {
    super({ axiosInstance: isomerRepoAxiosInstance })
    this.gitFileSystemService = gitFileSystemService
    this.gitFileCommitService = gitFileCommitService
  }

  getCommitDiff(siteName: string, base?: string, head?: string) {
    return ReviewApi.getCommitDiff(siteName, base, head)
  }

  createPullRequest(
    siteName: string,
    title: string,
    description?: string,
    base?: string,
    head?: string
  ) {
    return ReviewApi.createPullRequest(siteName, title, description, base, head)
  }

  getPullRequest(siteName: string, pullRequestNumber: number) {
    return ReviewApi.getPullRequest(siteName, pullRequestNumber)
  }

  getBlob(repo: string, path: string, ref: string) {
    return ReviewApi.getBlob(repo, path, ref)
  }

  updatePullRequest(
    siteName: string,
    pullRequestNumber: number,
    title: string,
    description?: string
  ) {
    return ReviewApi.updatePullRequest(
      siteName,
      pullRequestNumber,
      title,
      description
    )
  }

  closeReviewRequest(siteName: string, pullRequestNumber: number) {
    return ReviewApi.closeReviewRequest(siteName, pullRequestNumber)
  }

  mergePullRequest(siteName: string, pullRequestNumber: number) {
    return ReviewApi.mergePullRequest(siteName, pullRequestNumber)
  }

  approvePullRequest(siteName: string, pullRequestNumber: number) {
    return ReviewApi.approvePullRequest(siteName, pullRequestNumber)
  }

  async getComments(siteName: string, pullRequestNumber: number) {
    return ReviewApi.getComments(siteName, pullRequestNumber)
  }

  async createComment(
    siteName: string,
    pullRequestNumber: number,
    user: string,
    message: string
  ) {
    return ReviewApi.createComment(siteName, pullRequestNumber, user, message)
  }

  getFilePath({ siteName, fileName, directoryName }: any): any {
    return super.getFilePath({
      siteName,
      fileName,
      directoryName,
    })
  }

  getBlobPath({ siteName, fileSha }: any): any {
    return super.getBlobPath({ siteName, fileSha })
  }

  getFolderPath({ siteName, directoryName }: any) {
    return super.getFolderPath({ siteName, directoryName })
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
    if (
      sessionData.growthbook?.getFeatureValue(
        FEATURE_FLAGS.IS_GGS_ENABLED,
        false
      )
    ) {
      logger.info(
        `Writing file to local Git file system - Site name: ${sessionData.siteName}, directory name: ${directoryName}, file name: ${fileName}`
      )

      return this.gitFileCommitService.create(sessionData, {
        content,
        fileName,
        directoryName,
        isMedia,
      })
    }
    return super.create(sessionData, {
      content,
      fileName,
      directoryName,
      isMedia,
    })
  }

  async read(
    sessionData: UserWithSiteSessionData,
    { fileName, directoryName }: { fileName: string; directoryName?: string }
  ): Promise<GitFile> {
    if (
      sessionData.growthbook?.getFeatureValue(
        FEATURE_FLAGS.IS_GGS_ENABLED,
        false
      )
    ) {
      logger.info("Reading file from local Git file system")
      const filePath = directoryName ? `${directoryName}/${fileName}` : fileName
      const result = await this.gitFileSystemService.read(
        sessionData.siteName,
        filePath
      )

      if (result.isErr()) {
        throw result.error
      }

      return result.value
    }

    return super.read(sessionData, {
      fileName,
      directoryName,
    })
  }

  async readMediaFile(
    sessionData: UserWithSiteSessionData,
    { fileName, directoryName }: { fileName: string; directoryName: string }
  ): Promise<MediaFileOutput> {
    logger.debug(`Reading media file: ${fileName}`)
    logger.debug(`Reading directoryName: ${directoryName}`)
    const { siteName } = sessionData

    // fetch from local disk
    if (
      sessionData.growthbook?.getFeatureValue(
        FEATURE_FLAGS.IS_GGS_ENABLED,
        false
      )
    ) {
      logger.info(
        `Reading media file from disk. Site name: ${siteName}, directory name: ${directoryName}, file name: ${fileName},`
      )
      const result = await this.gitFileSystemService.readMediaFile(
        siteName,
        directoryName,
        fileName
      )
      if (result.isErr()) {
        throw result.error
      }

      return result.value
    }

    // fetch from Github
    const filePath = `${directoryName}/${fileName}`
    const directoryData = await super.readDirectory(sessionData, {
      directoryName,
    })
    const {
      author: { date: addedTime },
    } = await super.getLatestCommitOfPath(sessionData, filePath)

    const mediaType = directoryName.split("/")[0] as MediaType
    const targetFile = directoryData.find(
      (fileOrDir: { name: string }) => fileOrDir.name === fileName
    )
    const { private: isPrivate } = await super.getRepoInfo(sessionData)

    return getMediaFileInfo({
      file: targetFile,
      siteName,
      directoryName,
      mediaType,
      addedTime,
      isPrivate,
    })
  }

  async readDirectory(
    sessionData: UserWithSiteSessionData,
    { directoryName }: { directoryName: string }
  ): Promise<GitDirectoryItem[]> {
    const defaultBranch = STAGING_BRANCH
    if (
      sessionData.growthbook?.getFeatureValue(
        FEATURE_FLAGS.IS_GGS_ENABLED,
        false
      )
    ) {
      logger.info("Reading directory from local Git file system")
      const result = await this.gitFileSystemService.listDirectoryContents(
        sessionData.siteName,
        directoryName,
        defaultBranch
      )

      if (result.isErr()) {
        throw result.error
      }

      return [...result.value.directories, ...result.value.files]
    }

    return super.readDirectory(sessionData, {
      directoryName,
    })
  }

  async readMediaDirectory(
    sessionData: UserWithSiteSessionData,
    directoryName: string,
    // NOTE: The last seen index denotes the previous seen images.
    // We will tiebreak in alphabetical order - we sort
    // and then we return the first n.
    page = 0,
    limit = 15,
    search = ""
  ): Promise<{
    directories: MediaDirOutput[]
    files: Pick<MediaFileOutput, "name">[]
    total: number
  }> {
    const { siteName } = sessionData
    const defaultBranch = STAGING_BRANCH
    logger.debug(`Reading media directory: ${directoryName}`)
    let dirContent: DirectoryContents

    if (
      sessionData.growthbook?.getFeatureValue(
        FEATURE_FLAGS.IS_GGS_ENABLED,
        false
      )
    ) {
      const result = await this.gitFileSystemService.listDirectoryContents(
        siteName,
        directoryName,
        defaultBranch,
        page,
        limit,
        search
      )

      if (result.isErr()) {
        throw result.error
      }

      dirContent = result.value
    } else {
      const contents = await super.readDirectory(sessionData, {
        directoryName,
      })
      dirContent = getPaginatedDirectoryContents(contents, page, limit, search)
    }

    const { directories, files, total } = dirContent

    return {
      directories: directories.map(({ name, type }) => ({
        name,
        type,
      })),
      files,
      total,
    }
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
    if (
      sessionData.growthbook?.getFeatureValue(
        FEATURE_FLAGS.IS_GGS_ENABLED,
        false
      )
    ) {
      return this.gitFileCommitService.update(sessionData, {
        fileContent,
        sha,
        fileName,
        directoryName,
      })
    }

    return super.update(sessionData, {
      fileContent,
      sha,
      fileName,
      directoryName,
    })
  }

  async deleteDirectory(
    sessionData: UserWithSiteSessionData,
    {
      directoryName,
      message,
      githubSessionData,
    }: {
      directoryName: string
      message: string
      githubSessionData: GithubSessionData
    }
  ): Promise<void> {
    if (
      sessionData.growthbook?.getFeatureValue(
        FEATURE_FLAGS.IS_GGS_ENABLED,
        false
      )
    ) {
      await this.gitFileCommitService.deleteDirectory(sessionData, {
        directoryName,
      })
      return
    }

    super.deleteDirectory(sessionData, {
      directoryName,
      message,
      githubSessionData,
    })
  }

  // deletes a file
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
    if (
      sessionData.growthbook?.getFeatureValue(
        FEATURE_FLAGS.IS_GGS_ENABLED,
        false
      )
    ) {
      await this.gitFileCommitService.delete(sessionData, {
        sha,
        fileName,
        directoryName,
      })
      return
    }

    // GitHub flow
    await super.delete(sessionData, {
      sha,
      fileName,
      directoryName,
    })
  }

  async renameSinglePath(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    oldPath: string,
    newPath: string,
    message?: string
  ): Promise<GitCommitResult> {
    if (
      sessionData.growthbook?.getFeatureValue(
        FEATURE_FLAGS.IS_GGS_ENABLED,
        false
      )
    ) {
      return this.gitFileCommitService.renameSinglePath(
        sessionData,
        githubSessionData,
        oldPath,
        newPath,
        message
      )
    }
    return super.renameSinglePath(
      sessionData,
      githubSessionData,
      oldPath,
      newPath,
      message
    )
  }

  async moveFiles(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    oldPath: string,
    newPath: string,
    targetFiles: string[],
    message?: string
  ): Promise<GitCommitResult> {
    if (
      sessionData.growthbook?.getFeatureValue(
        FEATURE_FLAGS.IS_GGS_ENABLED,
        false
      )
    ) {
      return this.gitFileCommitService.moveFiles(
        sessionData,
        githubSessionData,
        oldPath,
        newPath,
        targetFiles,
        message
      )
    }

    return super.moveFiles(
      sessionData,
      githubSessionData,
      oldPath,
      newPath,
      targetFiles,
      message
    )
  }

  async getRepoInfo(sessionData: any): Promise<any> {
    return super.getRepoInfo(sessionData)
  }

  async getRepoState(sessionData: any): Promise<any> {
    return super.getRepoState(sessionData)
  }

  async getLatestCommitOfBranch(
    sessionData: UserWithSiteSessionData,
    branchName: string
  ): Promise<GitHubCommitData> {
    const { siteName } = sessionData
    if (
      sessionData.growthbook?.getFeatureValue(
        FEATURE_FLAGS.IS_GGS_ENABLED,
        false
      )
    ) {
      logger.info(
        `Getting latest commit of branch ${branchName} for site ${siteName} from local Git file system`
      )
      const result = await this.gitFileSystemService.getLatestCommitOfBranch(
        siteName,
        branchName
      )
      if (result.isErr()) {
        throw result.error
      }
      return result.value
    }
    return super.getLatestCommitOfBranch(sessionData, branchName)
  }

  async getTree(
    sessionData: any,
    githubSessionData: any,
    { isRecursive }: any
  ): Promise<RawGitTreeEntry[]> {
    return super.getTree(sessionData, githubSessionData, {
      isRecursive,
    })
  }

  async updateTree(
    sessionData: any,
    githubSessionData: any,
    { gitTree, message }: any
  ): Promise<any> {
    return super.updateTree(sessionData, githubSessionData, {
      gitTree,
      message,
    })
  }

  async updateRepoState(
    sessionData: UserWithSiteSessionData,
    {
      commitSha,
      branchName = BRANCH_REF,
    }: { commitSha: string; branchName: string }
  ): Promise<void> {
    const { siteName } = sessionData
    if (
      sessionData.growthbook?.getFeatureValue(
        FEATURE_FLAGS.IS_GGS_ENABLED,
        false
      )
    ) {
      logger.info(
        `Updating repo state for site ${siteName} to ${commitSha} on local Git file system`
      )
      const result = await this.gitFileSystemService.updateRepoState(
        siteName,
        branchName,
        commitSha
      )
      if (result.isErr()) {
        throw result.error
      }
      return
    }

    await super.updateRepoState(sessionData, { commitSha })
  }

  async checkHasAccess(sessionData: any): Promise<any> {
    return super.checkHasAccess(sessionData)
  }

  async changeRepoPrivacy(
    sessionData: any,
    shouldMakePrivate: any
  ): Promise<any> {
    return super.changeRepoPrivacy(sessionData, shouldMakePrivate)
  }
}
