import { GrowthBook } from "@growthbook/growthbook"
import { AxiosCacheInstance } from "axios-cache-interceptor"
import _ from "lodash"

import config from "@config/config"

import logger from "@logger/logger"

import GithubSessionData from "@root/classes/GithubSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { FEATURE_FLAGS } from "@root/constants"
import { ConflictError } from "@root/errors/ConflictError"
import { GitHubCommitData } from "@root/types/commitData"
import { FeatureFlags } from "@root/types/featureFlags"
import type {
  GitCommitResult,
  GitDirectoryItem,
  GitFile,
} from "@root/types/gitfilesystem"
import { RawGitTreeEntry } from "@root/types/github"
import { MediaDirOutput, MediaFileOutput, MediaType } from "@root/types/media"
import { getMediaFileInfo } from "@root/utils/media-utils"

import GitFileSystemService from "./GitFileSystemService"
import { GitHubService } from "./GitHubService"
import * as ReviewApi from "./review"

const PLACEHOLDER_FILE_NAME = ".keep"
const BRANCH_REF = config.get("github.branchRef")

const getPaginatedDirectoryContents = (
  directoryContents: GitDirectoryItem[],
  page: number,
  limit = 15
): {
  directories: GitDirectoryItem[]
  files: GitDirectoryItem[]
  total: number
} => {
  const subdirectories = directoryContents.filter((item) => item.type === "dir")
  const files = directoryContents.filter(
    (item) => item.type === "file" && item.name !== PLACEHOLDER_FILE_NAME
  )
  const paginatedFiles = _(files)
    .sortBy(["name"])
    .drop(page * limit)
    .take(limit)
    .value()

  return {
    directories: subdirectories,
    files: paginatedFiles,
    total: files.length,
  }
}

// TODO: update the typings here to remove `any`.
// We can type as `unknown` if required.
export default class RepoService extends GitHubService {
  private readonly gitFileSystemService: GitFileSystemService

  constructor(
    axiosInstance: AxiosCacheInstance,
    gitFileSystemService: GitFileSystemService
  ) {
    super({ axiosInstance })
    this.gitFileSystemService = gitFileSystemService
  }

  getGgsWhitelistedRepos(
    growthbook: GrowthBook<FeatureFlags> | undefined
  ): string[] {
    if (!growthbook) return []

    const whitelistedRepos = growthbook.getFeatureValue(
      FEATURE_FLAGS.GGS_WHITELISTED_REPOS,
      { repos: [] }
    )
    return whitelistedRepos.repos
  }

  isRepoWhitelisted(repoName: string, ggsWhitelistedRepos: string[]): boolean {
    // TODO: Adding for initial debugging if required. Remove once stabilised
    logger.info(
      `Evaluating if ${repoName} is GGS whitelisted: ${ggsWhitelistedRepos.includes(
        repoName
      )}`
    )

    return ggsWhitelistedRepos.includes(repoName)
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
      this.isRepoWhitelisted(
        sessionData.siteName,
        this.getGgsWhitelistedRepos(sessionData.growthbook)
      )
    ) {
      logger.info(
        `Writing file to local Git file system - Site name: ${sessionData.siteName}, directory name: ${directoryName}, file name: ${fileName}`
      )
      const result = await this.gitFileSystemService.create(
        sessionData.siteName,
        sessionData.isomerUserId,
        content,
        directoryName,
        fileName,
        isMedia ? "base64" : "utf-8"
      )

      if (result.isErr()) {
        throw result.error
      }

      this.gitFileSystemService.push(sessionData.siteName, BRANCH_REF)
      return { sha: result.value.newSha }
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
      this.isRepoWhitelisted(
        sessionData.siteName,
        this.getGgsWhitelistedRepos(sessionData.growthbook)
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
      this.isRepoWhitelisted(
        siteName,
        this.getGgsWhitelistedRepos(sessionData.growthbook)
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
    const directoryData = await super.readDirectory(sessionData, {
      directoryName,
    })

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
      isPrivate,
    })
  }

  async readDirectory(
    sessionData: UserWithSiteSessionData,
    { directoryName }: { directoryName: string }
  ): Promise<GitDirectoryItem[]> {
    if (
      this.isRepoWhitelisted(
        sessionData.siteName,
        this.getGgsWhitelistedRepos(sessionData.growthbook)
      )
    ) {
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
    limit = 15
  ): Promise<{
    directories: MediaDirOutput[]
    files: Pick<MediaFileOutput, "name">[]
    total: number
  }> {
    const { siteName } = sessionData
    logger.debug(`Reading media directory: ${directoryName}`)
    let dirContent: GitDirectoryItem[] = []

    if (
      this.isRepoWhitelisted(
        siteName,
        this.getGgsWhitelistedRepos(sessionData.growthbook)
      )
    ) {
      const result = await this.gitFileSystemService.listDirectoryContents(
        siteName,
        directoryName
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
      limit
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
      this.isRepoWhitelisted(
        sessionData.siteName,
        this.getGgsWhitelistedRepos(sessionData.growthbook)
      )
    ) {
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

      this.gitFileSystemService.push(sessionData.siteName, BRANCH_REF)
      return { newSha: result.value }
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
      this.isRepoWhitelisted(
        sessionData.siteName,
        this.getGgsWhitelistedRepos(sessionData.growthbook)
      )
    ) {
      logger.info(
        `Deleting directory in local Git file system for repo: ${sessionData.siteName}, directory name: ${directoryName}`
      )
      const result = await this.gitFileSystemService.delete(
        sessionData.siteName,
        directoryName,
        "",
        sessionData.isomerUserId,
        true
      )

      if (result.isErr()) {
        throw result.error
      }

      this.gitFileSystemService.push(sessionData.siteName, BRANCH_REF)
      return
    }

    // GitHub flow
    const gitTree = await this.getTree(sessionData, githubSessionData, {
      isRecursive: true,
    })

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

    const newCommitSha = await this.updateTree(sessionData, githubSessionData, {
      gitTree: newGitTree,
      message,
    })

    await this.updateRepoState(sessionData, {
      commitSha: newCommitSha,
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
      this.isRepoWhitelisted(
        sessionData.siteName,
        this.getGgsWhitelistedRepos(sessionData.growthbook)
      )
    ) {
      logger.info(
        `Deleting file in local Git file system for repo: ${sessionData.siteName}, directory name: ${directoryName}, file name: ${fileName}`
      )

      const filePath = directoryName ? `${directoryName}/${fileName}` : fileName

      const result = await this.gitFileSystemService.delete(
        sessionData.siteName,
        filePath,
        sha,
        sessionData.isomerUserId,
        false
      )

      if (result.isErr()) {
        throw result.error
      }

      this.gitFileSystemService.push(sessionData.siteName, BRANCH_REF)
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
      this.isRepoWhitelisted(
        sessionData.siteName,
        this.getGgsWhitelistedRepos(sessionData.growthbook)
      )
    ) {
      logger.info("Renaming file/directory in local Git file system")
      const result = await this.gitFileSystemService.renameSinglePath(
        sessionData.siteName,
        oldPath,
        newPath,
        sessionData.isomerUserId,
        message
      )

      if (result.isErr()) {
        throw result.error
      }

      this.gitFileSystemService.push(sessionData.siteName, BRANCH_REF)
      return { newSha: result.value }
    }

    const gitTree = await super.getTree(sessionData, githubSessionData, {
      isRecursive: true,
    })
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
      }
    )
    await super.updateRepoState(sessionData, {
      commitSha: newCommitSha,
    })

    return { newSha: newCommitSha }
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
      this.isRepoWhitelisted(
        sessionData.siteName,
        this.getGgsWhitelistedRepos(sessionData.growthbook)
      )
    ) {
      logger.info("Moving files in local Git file system")
      const result = await this.gitFileSystemService.moveFiles(
        sessionData.siteName,
        oldPath,
        newPath,
        sessionData.isomerUserId,
        targetFiles,
        message
      )

      if (result.isErr()) {
        throw result.error
      }

      this.gitFileSystemService.push(sessionData.siteName, BRANCH_REF)
      return { newSha: result.value }
    }

    const gitTree = await super.getTree(sessionData, githubSessionData, {
      isRecursive: true,
    })
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
      }
    )

    await super.updateRepoState(sessionData, {
      commitSha: newCommitSha,
    })

    return { newSha: newCommitSha }
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
      this.isRepoWhitelisted(
        siteName,
        this.getGgsWhitelistedRepos(sessionData.growthbook)
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
    }: { commitSha: string; branchName?: string }
  ): Promise<void> {
    const { siteName } = sessionData
    if (
      this.isRepoWhitelisted(
        siteName,
        this.getGgsWhitelistedRepos(sessionData.growthbook)
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
    return super.changeRepoPrivacy(sessionData, {
      shouldMakePrivate,
    })
  }
}
