import { AxiosCacheInstance } from "axios-cache-interceptor"
import _ from "lodash"

import config from "@config/config"

import logger from "@logger/logger"

import GithubSessionData from "@root/classes/GithubSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { FEATURE_FLAGS, STAGING_BRANCH } from "@root/constants"
import { GitHubCommitData } from "@root/types/commitData"
import type {
  GitCommitResult,
  GitDirectoryItem,
  GitFile,
} from "@root/types/gitfilesystem"
import { RawGitTreeEntry } from "@root/types/github"
import { MediaDirOutput, MediaFileOutput, MediaType } from "@root/types/media"
import { getMediaFileInfo } from "@root/utils/media-utils"

import GitFileCommitService from "./GitFileCommitService"
import GitFileSystemService from "./GitFileSystemService"
import GitHubCommitService from "./GithubCommitService"
import GitHubService from "./GitHubService"
import * as ReviewApi from "./review"

const PLACEHOLDER_FILE_NAME = ".keep"
const BRANCH_REF = config.get("github.branchRef")

const getPaginatedDirectoryContents = (
  directoryContents: GitDirectoryItem[],
  page: number,
  limit = 15,
  search = ""
): {
  directories: GitDirectoryItem[]
  files: GitDirectoryItem[]
  total: number
} => {
  const subdirectories = directoryContents.filter((item) => item.type === "dir")
  const files = directoryContents.filter(
    (item) => item.type === "file" && item.name !== PLACEHOLDER_FILE_NAME
  )

  let sortedFiles = _(files)
    // Note: We are sorting by name here to maintain compatibility for
    // GitHub-login users, since it is very expensive to get the addedTime for
    // each file from the GitHub API. The files will be sorted by addedTime in
    // milliseconds for GGS users, so they will never see the alphabetical
    // sorting.
    .orderBy(
      [(file) => file.addedTime, (file) => file.name.toLowerCase()],
      ["desc", "asc"]
    )

  if (search) {
    sortedFiles = sortedFiles.filter((file) =>
      file.name.toLowerCase().includes(search.toLowerCase())
    )
  }
  const totalLength = sortedFiles.value().length

  const paginatedFiles = sortedFiles
    .drop(page * limit)
    .take(limit)
    .value()

  return {
    directories: subdirectories,
    files: paginatedFiles,
    total: totalLength,
  }
}

// TODO: update the typings here to remove `any`.
// We can type as `unknown` if required.

interface RepoServiceParams {
  isomerRepoAxiosInstance: AxiosCacheInstance
  gitFileSystemService: GitFileSystemService
  gitFileCommitService: GitFileCommitService
  gitHubCommitService: GitHubCommitService
}

export default class RepoService extends GitHubService {
  private readonly gitFileSystemService: GitFileSystemService

  private readonly gitFileCommitService: GitFileCommitService

  private readonly githubCommitService: GitHubCommitService

  constructor({
    isomerRepoAxiosInstance,
    gitFileSystemService,
    gitFileCommitService,
    gitHubCommitService,
  }: RepoServiceParams) {
    super({ axiosInstance: isomerRepoAxiosInstance })
    this.gitFileSystemService = gitFileSystemService
    this.gitFileCommitService = gitFileCommitService
    this.githubCommitService = gitHubCommitService
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
    return this.githubCommitService.create(sessionData, {
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

      return result.value
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
    let dirContent: GitDirectoryItem[] = []

    if (
      sessionData.growthbook?.getFeatureValue(
        FEATURE_FLAGS.IS_GGS_ENABLED,
        false
      )
    ) {
      const result = await this.gitFileSystemService.listDirectoryContents(
        siteName,
        directoryName,
        defaultBranch
      )

      if (result.isErr()) {
        throw result.error
      }

      dirContent = result.value
    } else {
      dirContent = (await super.readDirectory(sessionData, {
        directoryName,
      })) as GitDirectoryItem[]
    }

    const { directories, files, total } = getPaginatedDirectoryContents(
      dirContent,
      page,
      limit,
      search
    )

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

    return this.githubCommitService.update(sessionData, {
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

    await this.githubCommitService.deleteDirectory(sessionData, {
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
    await this.githubCommitService.delete(sessionData, {
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
    return this.githubCommitService.renameSinglePath(
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

    return this.githubCommitService.moveFiles(
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
    { gitTree, message }: any,
    isStaging: boolean
  ): Promise<any> {
    return super.updateTree(
      sessionData,
      githubSessionData,
      {
        gitTree,
        message,
      },
      isStaging
    )
  }

  async updateRepoState(
    sessionData: UserWithSiteSessionData,
    {
      commitSha,
      branchName = BRANCH_REF,
    }: { commitSha: string; branchName?: string }
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

    await super.updateRepoState(sessionData, { commitSha, branchName })
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
