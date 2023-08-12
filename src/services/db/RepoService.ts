import { AxiosCacheInstance } from "axios-cache-interceptor"
import { directory, file } from "mock-fs/lib/filesystem"

import config from "@config/config"

import logger from "@logger/logger"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import {
  MediaType,
  ReadMediaDirectoryInput,
  ReadMediaDirectoryOutput,
} from "@root/types"
import { GitHubCommitData } from "@root/types/commitData"
import type {
  GitCommitResult,
  GitDirectoryItem,
  GitFile,
} from "@root/types/gitfilesystem"
import { getMediaFileInfo } from "@root/utils/media-utils"

import GitFileSystemService from "./GitFileSystemService"
import { GitHubService } from "./GitHubService"
import * as ReviewApi from "./review"

const WHITELISTED_GIT_SERVICE_REPOS = config.get(
  "featureFlags.ggsWhitelistedRepos"
)
const PLACEHOLDER_FILE_NAME = ".keep"
export default class RepoService extends GitHubService {
  private readonly gitFileSystemService: GitFileSystemService

  constructor(
    axiosInstance: AxiosCacheInstance,
    gitFileSystemService: GitFileSystemService
  ) {
    super({ axiosInstance })
    this.gitFileSystemService = gitFileSystemService
  }

  isRepoWhitelisted(repoName: string): boolean {
    return WHITELISTED_GIT_SERVICE_REPOS.split(",").includes(repoName)
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
    sessionData: any,
    { content, fileName, directoryName, isMedia = false }: any
  ): Promise<any> {
    return await super.create(sessionData, {
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
    if (this.isRepoWhitelisted(sessionData.siteName)) {
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

    return await super.read(sessionData, {
      fileName,
      directoryName,
    })
  }

  async readMediaFile(
    sessionData: UserWithSiteSessionData,
    { fileName, directoryName }: { fileName: string; directoryName: string }
  ): Promise<any> {
    logger.debug(`Reading media file: ${fileName}`)
    logger.debug(`Reading directoryName: ${directoryName}`)
    const { siteName } = sessionData

    // fetch from local disk
    if (this.isRepoWhitelisted(siteName)) {
      logger.info(
        `Reading media file from disk. Sitname: ${siteName}, directory name: ${directoryName}, fileName: ${fileName},`
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
    const directoryData = await super.readDirectory(sessionData, {
      directoryName,
    })

    const mediaType = directoryName.split("/")[0] as MediaType
    const targetFile = directoryData.find(
      (fileOrDir: { name: string }) => fileOrDir.name === fileName
    )
    const { private: isPrivate } = await super.getRepoInfo(sessionData)

    return await getMediaFileInfo({
      file: targetFile,
      siteName,
      directoryName,
      mediaType,
      isPrivate,
    })
  }

  // TODO: This is no longer used, remove it
  async readMedia(sessionData: any, { fileSha }: any): Promise<any> {
    return await super.readMedia(sessionData, { fileSha })
  }

  async readDirectory(
    sessionData: UserWithSiteSessionData,
    { directoryName }: { directoryName: string }
  ): Promise<GitDirectoryItem[]> {
    if (this.isRepoWhitelisted(sessionData.siteName)) {
      logger.info("Reading directory from local Git file system")
      const result = await this.gitFileSystemService.listDirectoryContents(
        sessionData.siteName,
        directoryName
      )

      if (result.isErr()) {
        throw result.error
      }

      return result.value
    }

    return await super.readDirectory(sessionData, {
      directoryName,
    })
  }

  async readMediaDirectory(
    sessionData: UserWithSiteSessionData,
    directoryName: string
  ): Promise<any> {
    const { siteName } = sessionData
    logger.debug(`Reading media directory: ${directoryName}`)

    let filteredResult: any[] = []
    let isPrivate = false
    const filterLogic = (file: any) =>
      (file.type === "file" || file.type === "dir") &&
      file.name !== PLACEHOLDER_FILE_NAME

    if (this.isRepoWhitelisted(siteName)) {
      const result = await this.gitFileSystemService.listDirectoryContents(
        siteName,
        directoryName
      )

      if (result.isErr()) {
        throw result.error
      }

      filteredResult = result.value.filter(filterLogic)
    } else {
      const repoInfo = await super.getRepoInfo(sessionData)
      isPrivate = repoInfo.private
      const files = await super.readDirectory(sessionData, {
        directoryName,
      })
      filteredResult = files.filter(filterLogic)
    }

    return Promise.all(
      filteredResult.map((curr) => {
        if (curr.type === "dir") {
          return {
            name: curr.name,
            type: curr.type,
          }
        }

        // GGS flow
        if (this.isRepoWhitelisted(siteName)) {
          return this.readMediaFile(sessionData, {
            fileName: curr.name,
            directoryName,
          })
        }

        // GitHub flow
        const mediaType = directoryName.split("/")[0]
        return getMediaFileInfo({
          file: curr,
          siteName,
          directoryName,
          mediaType: mediaType as MediaType,
          isPrivate,
        })
      })
    )
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
    if (this.isRepoWhitelisted(sessionData.siteName)) {
      logger.info("Updating file in local Git file system")
      const filePath = directoryName ? `${directoryName}/${fileName}` : fileName
      const result = await this.gitFileSystemService.update(
        sessionData.siteName,
        filePath,
        fileContent,
        sha,
        sessionData.isomerUserId
      )

      if (result.isErr()) {
        throw result.error
      }

      this.gitFileSystemService.push(sessionData.siteName)
      return { newSha: result.value }
    }

    return await super.update(sessionData, {
      fileContent,
      sha,
      fileName,
      directoryName,
    })
  }

  async delete(
    sessionData: any,
    { sha, fileName, directoryName }: any
  ): Promise<any> {
    return await super.delete(sessionData, {
      sha,
      fileName,
      directoryName,
    })
  }

  async getRepoInfo(sessionData: any): Promise<any> {
    return await super.getRepoInfo(sessionData)
  }

  async getRepoState(sessionData: any): Promise<any> {
    return await super.getRepoState(sessionData)
  }

  async getLatestCommitOfBranch(
    sessionData: UserWithSiteSessionData,
    branchName: string
  ): Promise<GitHubCommitData> {
    const { siteName } = sessionData
    if (this.isRepoWhitelisted(siteName)) {
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
    return await super.getLatestCommitOfBranch(sessionData, branchName)
  }

  async getTree(
    sessionData: any,
    githubSessionData: any,
    { isRecursive }: any
  ): Promise<any> {
    return await super.getTree(sessionData, githubSessionData, {
      isRecursive,
    })
  }

  async updateTree(
    sessionData: any,
    githubSessionData: any,
    { gitTree, message }: any
  ): Promise<any> {
    return await super.updateTree(sessionData, githubSessionData, {
      gitTree,
      message,
    })
  }

  async updateRepoState(sessionData: any, { commitSha }: any): Promise<any> {
    return await super.updateRepoState(sessionData, { commitSha })
  }

  async checkHasAccess(sessionData: any): Promise<any> {
    return await super.checkHasAccess(sessionData)
  }

  async changeRepoPrivacy(
    sessionData: any,
    shouldMakePrivate: any
  ): Promise<any> {
    return await super.changeRepoPrivacy(sessionData, {
      shouldMakePrivate,
    })
  }
}
