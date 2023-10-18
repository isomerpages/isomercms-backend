import { AxiosCacheInstance } from "axios-cache-interceptor"
import { Base64 } from "js-base64"
import { okAsync, errAsync } from "neverthrow"

import { ConflictError, inputNameConflictErrorMsg } from "@errors/ConflictError"
import { NotFoundError } from "@errors/NotFoundError"
import { UnprocessableError } from "@errors/UnprocessableError"

import { isAxiosError, validateStatus } from "@utils/axios-utils"

import GithubSessionData from "@root/classes/GithubSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { STAGING_BRANCH, STAGING_LITE_BRANCH } from "@root/constants"
import logger from "@root/logger/logger"
import { GitCommitResult } from "@root/types/gitfilesystem"
import { RawGitTreeEntry } from "@root/types/github"

import * as ReviewApi from "./review"

export default class GitHubService {
  private readonly axiosInstance: AxiosCacheInstance

  constructor({ axiosInstance }: { axiosInstance: AxiosCacheInstance }) {
    this.axiosInstance = axiosInstance
  }

  getCommitDiff(
    siteName: string,
    base: string | undefined,
    head: string | undefined
  ) {
    return ReviewApi.getCommitDiff(siteName, base, head)
  }

  createPullRequest(
    siteName: string,
    title: string,
    description: string | undefined
  ) {
    return ReviewApi.createPullRequest(siteName, title, description)
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
    description: string | undefined
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

  getFilePath({
    siteName,
    fileName,
    directoryName,
  }: {
    siteName: string
    fileName: string
    directoryName: string | undefined
  }) {
    if (!directoryName)
      return `${siteName}/contents/${encodeURIComponent(fileName)}`
    const encodedDirPath = directoryName
      .split("/")
      .map((folder: string | number | boolean) => encodeURIComponent(folder))
      .join("/")
    return `${siteName}/contents/${encodedDirPath}/${encodeURIComponent(
      fileName
    )}`
  }

  getBlobPath({ siteName, fileSha }: { siteName: string; fileSha: string }) {
    return `${siteName}/git/blobs/${fileSha}`
  }

  getFolderPath({
    siteName,
    directoryName,
  }: {
    siteName: string
    directoryName: string
  }) {
    const encodedDirPath = directoryName
      .split("/")
      .map((folder: string | number | boolean) => encodeURIComponent(folder))
      .join("/")
    return `${siteName}/contents/${encodedDirPath}`
  }

  async create(
    sessionData: UserWithSiteSessionData,
    {
      content,
      fileName,
      directoryName,
      isMedia = false,
      branchName = STAGING_BRANCH,
    }: {
      content: string
      fileName: string
      directoryName: string
      isMedia: boolean
      branchName: string
    }
  ) {
    const { accessToken, siteName, isomerUserId: userId } = sessionData
    try {
      const endpoint = this.getFilePath({ siteName, fileName, directoryName })

      /**
       * Currently, this rides on the assumption that creating a top level
       * directly will create a collection.yml file, and creating a new resource
       * folder will create an index.html file.
       */
      const isCreatingTopLevelDirectory = fileName === "collection.yml"
      const isCreatingNewResourceFolder = fileName === "index.html"
      const checkDirectoryExist =
        !isCreatingTopLevelDirectory && !isCreatingNewResourceFolder
      if (checkDirectoryExist) {
        /**
         * When we are creating a new resource post or creating a new subDirectory,
         * we create a _posts and a .keep folder respectively. However, we still need to check if
         * parent directory still exists.
         */
        const isCreatingSubDirectory = fileName === ".keep"
        const isCreatingPostResource = directoryName.endsWith("_posts")
        if (!directoryName) {
          throw new NotFoundError("Directory name is not defined")
        }
        let pathToCheck = directoryName
        if (isCreatingSubDirectory || isCreatingPostResource) {
          // get parent directory
          pathToCheck = directoryName.split("/").slice(0, -1).join("/")
        }
        // this is to check if the file path still exists, else this will throw a 404
        await this.readDirectory(sessionData, { directoryName: pathToCheck })
      }

      // Validation and sanitisation of media already done
      const encodedContent = isMedia ? content : Base64.encode(content)

      const message = JSON.stringify({
        message: `Create file: ${fileName}`,
        fileName,
        userId,
      })
      const params = {
        message,
        content: encodedContent,
        branch: branchName,
      }

      const resp = await this.axiosInstance.put(endpoint, params, {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      })

      return { sha: resp.data.content.sha }
    } catch (err: unknown) {
      if (err instanceof NotFoundError) throw err
      if (isAxiosError(err) && err.response) {
        const { status } = err.response
        if (status === 422 || status === 409)
          throw new ConflictError(inputNameConflictErrorMsg(fileName))
        throw err.response
      }
      throw err
    }
  }

  async read(
    sessionData: UserWithSiteSessionData,
    {
      fileName,
      directoryName,
      branchName = STAGING_BRANCH,
    }: { fileName: any; directoryName: any; branchName?: string }
  ) {
    const { accessToken } = sessionData
    const { siteName } = sessionData
    const endpoint = this.getFilePath({ siteName, fileName, directoryName })

    const params = {
      ref: branchName,
    }

    const resp = await this.axiosInstance.get(endpoint, {
      validateStatus,
      params,
      headers: {
        Authorization: `token ${accessToken}`,
      },
    })

    if (resp.status === 404) throw new NotFoundError("File does not exist")

    const { content: encodedContent, sha } = resp.data
    const content = Base64.decode(encodedContent)

    return { content, sha }
  }

  async readMedia(
    sessionData: UserWithSiteSessionData,
    {
      fileSha,
      branchName = STAGING_BRANCH,
    }: { fileSha: any; branchName?: string }
  ) {
    /**
     * Files that are bigger than 1 MB needs to be retrieved
     * via Github Blob API. The content can only be retrieved through
     * the `sha` of the file.
     */
    const { accessToken } = sessionData
    const { siteName } = sessionData
    const params = {
      ref: branchName,
    }

    const blobEndpoint = this.getBlobPath({ siteName, fileSha })

    const resp = await this.axiosInstance.get(blobEndpoint, {
      validateStatus,
      params,
      headers: {
        Authorization: `token ${accessToken}`,
      },
    })

    if (resp.status === 404)
      throw new NotFoundError("Media file does not exist")

    const { content, sha } = resp.data

    return { content, sha }
  }

  async readDirectory(
    sessionData: UserWithSiteSessionData,
    {
      directoryName,
      branchName = STAGING_BRANCH,
    }: { directoryName: any; branchName?: string }
  ) {
    const { accessToken } = sessionData
    const { siteName } = sessionData
    const endpoint = this.getFolderPath({ siteName, directoryName })

    const params = {
      ref: branchName,
    }

    const resp = await this.axiosInstance.get(endpoint, {
      validateStatus,
      params,
      headers: {
        Authorization: `token ${accessToken}`,
      },
    })
    if (resp.status === 404) throw new NotFoundError("Directory does not exist")

    return resp.data
  }

  async update(
    sessionData: UserWithSiteSessionData,
    {
      fileContent,
      sha,
      fileName,
      directoryName,
      branchName,
    }: {
      fileContent: string
      sha: string
      fileName: string
      directoryName: string | undefined
      branchName: string
    }
  ): Promise<GitCommitResult> {
    const { accessToken, siteName, isomerUserId: userId } = sessionData
    try {
      const endpoint = this.getFilePath({ siteName, fileName, directoryName })
      // this is to check if the file path still exists, else this will throw a 404. Only needed for paths outside of root
      if (directoryName) {
        await this.readDirectory(sessionData, { directoryName })
      }
      const encodedNewContent = Base64.encode(fileContent)

      let fileSha = sha
      if (!sha) {
        const { sha: retrievedSha } = await this.read(sessionData, {
          fileName,
          directoryName,
        })
        fileSha = retrievedSha
      }

      const message = JSON.stringify({
        message: `Update file: ${fileName}`,
        fileName,
        userId,
      })
      const params = {
        message,
        content: encodedNewContent,
        branch: branchName,
        sha: fileSha,
      }

      const resp = await this.axiosInstance.put(endpoint, params, {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      })

      return { newSha: resp.data.content.sha }
    } catch (err) {
      if (err instanceof NotFoundError) throw err
      if (isAxiosError(err)) {
        const { response } = err
        if (response && response.status === 404) {
          throw new NotFoundError("File does not exist")
        }
        if (response && response.status === 409) {
          throw new ConflictError(
            "File has been changed recently, please try again"
          )
        }
        throw err
      }
      throw new UnprocessableError("Unable to update file")
    }
  }

  async delete(
    sessionData: UserWithSiteSessionData,
    {
      sha,
      fileName,
      directoryName,
      branchName = STAGING_BRANCH,
    }: {
      sha: string
      fileName: string
      directoryName: string
      branchName?: string
    }
  ) {
    const { accessToken, siteName, isomerUserId: userId } = sessionData
    try {
      const endpoint = this.getFilePath({ siteName, fileName, directoryName })

      let fileSha = sha
      if (!sha) {
        const { sha: retrievedSha } = await this.read(sessionData, {
          fileName,
          directoryName,
          branchName,
        })
        fileSha = retrievedSha
      }

      const message = JSON.stringify({
        message: `Delete file: ${fileName}`,
        fileName,
        userId,
      })
      const params = {
        message,
        branch: branchName,
        sha: fileSha,
      }

      await this.axiosInstance.delete(endpoint, {
        params,
        headers: {
          Authorization: `token ${accessToken}`,
        },
      })
    } catch (err) {
      if (err instanceof NotFoundError) throw err
      if (isAxiosError(err) && err.response) {
        const { status } = err.response
        if (status === 404) throw new NotFoundError("File does not exist")
        if (status === 409)
          throw new ConflictError(
            "File has been changed recently, please try again"
          )
      }
      throw err
    }
  }

  async getRepoInfo(sessionData: UserWithSiteSessionData) {
    const { siteName } = sessionData
    const { accessToken } = sessionData
    const endpoint = `${siteName}`
    const headers = {
      Authorization: `token ${accessToken}`,
    }
    const params = {
      ref: STAGING_BRANCH,
    }
    // Get the commits of the repo
    const { data } = await this.axiosInstance.get(endpoint, {
      params,
      headers,
    })

    return data
  }

  async getRepoState(sessionData: UserWithSiteSessionData) {
    const { accessToken } = sessionData
    const { siteName } = sessionData
    const endpoint = `${siteName}/commits`
    const headers = {
      Authorization: `token ${accessToken}`,
    }
    const params = {
      sha: STAGING_BRANCH,
    }
    // Get the commits of the repo
    const { data: commits } = await this.axiosInstance.get(endpoint, {
      params,
      headers,
    })
    // Get the tree sha of the latest commit
    const {
      commit: {
        tree: { sha: treeSha },
      },
    } = commits[0]
    const currentCommitSha = commits[0].sha

    return { treeSha, currentCommitSha }
  }

  async getLatestCommitOfBranch(
    sessionData: UserWithSiteSessionData,
    branch: string
  ) {
    const { accessToken, siteName } = sessionData
    const endpoint = `${siteName}/commits/${branch}`
    const headers = {
      Authorization: `token ${accessToken}`,
    }
    // Get the commits of the repo
    try {
      const { data: latestCommit } = await this.axiosInstance.get(endpoint, {
        headers,
      })
      const { commit: latestCommitMeta } = latestCommit
      return latestCommitMeta
    } catch (err) {
      if (err instanceof NotFoundError) throw err
      if (isAxiosError(err) && err.response) {
        const { status } = err.response
        if (status === 422)
          throw new UnprocessableError(`Branch ${branch} does not exist`)
      }
      throw err
    }
  }

  async getTree(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    { isRecursive }: any,
    isStaging = true
  ): Promise<RawGitTreeEntry[]> {
    const { accessToken } = sessionData
    const { siteName } = sessionData
    const { treeSha } = githubSessionData.getGithubState()
    const url = `${siteName}/git/trees/${treeSha}`

    const params = {
      ref: isStaging ? STAGING_BRANCH : STAGING_LITE_BRANCH,
      recursive: false,
    }

    if (isRecursive) params.recursive = true

    const {
      data: { tree: gitTree },
    } = await this.axiosInstance.get(url, {
      params,
      headers: { Authorization: `token ${accessToken}` },
    })

    return gitTree
  }

  async updateTree(
    sessionData: UserWithSiteSessionData,
    githubSessionData: GithubSessionData,
    { gitTree, message }: { gitTree: any; message: any },
    isStaging: boolean
  ) {
    const { accessToken, siteName, isomerUserId: userId } = sessionData
    const { treeSha, currentCommitSha } = githubSessionData.getGithubState()
    const url = `${siteName}/git/trees`

    const headers = {
      Authorization: `token ${accessToken}`,
    }

    const resp = await this.axiosInstance.post(
      url,
      {
        tree: gitTree,
        base_tree: treeSha,
      },
      { headers }
    )

    const {
      data: { sha: newTreeSha },
    } = resp

    const commitEndpoint = `${siteName}/git/commits`

    const stringifiedMessage = JSON.stringify({
      message: message || `isomerCMS updated ${siteName} state`,
      userId,
    })
    const newCommitResp = await this.axiosInstance.post(
      commitEndpoint,
      {
        message: stringifiedMessage,
        tree: newTreeSha,
        parents: [currentCommitSha],
      },
      { headers }
    )

    const newCommitSha = newCommitResp.data.sha

    return newCommitSha
  }

  async updateRepoState(
    sessionData: UserWithSiteSessionData,
    {
      commitSha,
      branchName = STAGING_BRANCH,
    }: { commitSha: any; branchName?: string }
  ) {
    const { accessToken } = sessionData
    const { siteName } = sessionData
    const refEndpoint = `${siteName}/git/refs/heads/${branchName}`
    const headers = {
      Authorization: `token ${accessToken}`,
    }

    await this.axiosInstance.patch(
      refEndpoint,
      { sha: commitSha, force: true },
      { headers }
    )
  }

  async checkHasAccess(sessionData: UserWithSiteSessionData) {
    const { accessToken } = sessionData
    const userId = sessionData.githubId
    const { siteName } = sessionData
    const endpoint = `${siteName}/collaborators/${userId}`

    const headers = {
      Authorization: `token ${accessToken}`,
      "Content-Type": "application/json",
    }
    try {
      await this.axiosInstance.get(endpoint, { headers })
    } catch (err) {
      if (err instanceof NotFoundError) throw err
      if (isAxiosError(err) && err.response) {
        const { status } = err.response
        // If user is unauthorized or site does not exist, show the same NotFoundError
        if (status === 404 || status === 403)
          throw new NotFoundError("Site does not exist")
      }
      throw err
    }
  }

  async changeRepoPrivacy(
    sessionData: { siteName: any; isomerUserId: any },
    shouldMakePrivate: boolean
  ) {
    const { siteName, isomerUserId } = sessionData
    const endpoint = `${siteName}`

    // Privatising a repo is restricted to repo admins - an admin token will be inserted in via our axios interceptor
    const headers = {
      Authorization: "",
      "Content-Type": "application/json",
    }
    try {
      await this.axiosInstance.patch(
        endpoint,
        { private: shouldMakePrivate },
        { headers }
      )
      return okAsync(null)
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        const { status } = error.response
        // If user is unauthorized or site does not exist, show the same NotFoundError
        if (status === 404 || status === 403) {
          logger.error(
            `User with id ${isomerUserId} attempted to change privacy of site ${siteName}`
          )
          return errAsync(new NotFoundError("Site does not exist"))
        }
      }
      return errAsync(error)
    }
  }
}
