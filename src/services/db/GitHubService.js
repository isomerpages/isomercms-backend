const { Base64 } = require("js-base64")

const BRANCH_REF = "staging"

const {
  ConflictError,
  inputNameConflictErrorMsg,
} = require("@errors/ConflictError")
const { NotFoundError } = require("@errors/NotFoundError")

const validateStatus = require("@utils/axios-utils")

const ReviewApi = require("./review")

class GitHubService {
  constructor({ axiosInstance }) {
    this.axiosInstance = axiosInstance
  }

  getCommitDiff(siteName, base, head) {
    return ReviewApi.getCommitDiff(siteName, base, head)
  }

  createPullRequest(siteName, title, description) {
    return ReviewApi.createPullRequest(siteName, title, description)
  }

  getPullRequest(siteName, pullRequestNumber) {
    return ReviewApi.getPullRequest(siteName, pullRequestNumber)
  }

  updatePullRequest(siteName, pullRequestNumber, title, description) {
    return ReviewApi.updatePullRequest(
      siteName,
      pullRequestNumber,
      title,
      description
    )
  }

  closeReviewRequest(siteName, pullRequestNumber) {
    return ReviewApi.closeReviewRequest(siteName, pullRequestNumber)
  }

  mergePullRequest(siteName, pullRequestNumber) {
    return ReviewApi.mergePullRequest(siteName, pullRequestNumber)
  }

  approvePullRequest(siteName, pullRequestNumber) {
    return ReviewApi.approvePullRequest(siteName, pullRequestNumber)
  }

  getFilePath({ siteName, fileName, directoryName }) {
    if (!directoryName)
      return `${siteName}/contents/${encodeURIComponent(fileName)}`
    const encodedDirPath = directoryName
      .split("/")
      .map((folder) => encodeURIComponent(folder))
      .join("/")
    return `${siteName}/contents/${encodedDirPath}/${encodeURIComponent(
      fileName
    )}`
  }

  getBlobPath({ siteName, fileSha }) {
    return `${siteName}/git/blobs/${fileSha}`
  }

  getFolderPath({ siteName, directoryName }) {
    const encodedDirPath = directoryName
      .split("/")
      .map((folder) => encodeURIComponent(folder))
      .join("/")
    return `${siteName}/contents/${encodedDirPath}`
  }

  async create(
    sessionData,
    { content, fileName, directoryName, isMedia = false }
  ) {
    const { accessToken, siteName, isomerUserId: userId } = sessionData
    try {
      const endpoint = this.getFilePath({ siteName, fileName, directoryName })
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
        branch: BRANCH_REF,
      }

      const resp = await this.axiosInstance.put(endpoint, params, {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      })

      return { sha: resp.data.content.sha }
    } catch (err) {
      const { status } = err.response
      if (status === 422 || status === 409)
        throw new ConflictError(inputNameConflictErrorMsg(fileName))
      throw err.response
    }
  }

  async read(sessionData, { fileName, directoryName }) {
    const { accessToken } = sessionData
    const { siteName } = sessionData
    const endpoint = this.getFilePath({ siteName, fileName, directoryName })

    const params = {
      ref: BRANCH_REF,
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

  async readMedia(sessionData, { fileSha }) {
    /**
     * Files that are bigger than 1 MB needs to be retrieved
     * via Github Blob API. The content can only be retrieved through
     * the `sha` of the file.
     */
    const { accessToken } = sessionData
    const { siteName } = sessionData
    const params = {
      ref: BRANCH_REF,
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

  async readDirectory(sessionData, { directoryName }) {
    const { accessToken } = sessionData
    const { siteName } = sessionData
    const endpoint = this.getFolderPath({ siteName, directoryName })

    const params = {
      ref: BRANCH_REF,
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

  async update(sessionData, { fileContent, sha, fileName, directoryName }) {
    const { accessToken, siteName, isomerUserId: userId } = sessionData
    try {
      const endpoint = this.getFilePath({ siteName, fileName, directoryName })
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
        branch: BRANCH_REF,
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
      const { status } = err.response
      if (status === 404) throw new NotFoundError("File does not exist")
      if (status === 409)
        throw new ConflictError(
          "File has been changed recently, please try again"
        )
      throw err
    }
  }

  async delete(sessionData, { sha, fileName, directoryName }) {
    const { accessToken, siteName, isomerUserId: userId } = sessionData
    try {
      const endpoint = this.getFilePath({ siteName, fileName, directoryName })

      let fileSha = sha
      if (!sha) {
        const { sha: retrievedSha } = await this.read({
          accessToken,
          fileName,
          directoryName,
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
        branch: BRANCH_REF,
        sha: fileSha,
      }

      await this.axiosInstance.delete(endpoint, {
        params,
        headers: {
          Authorization: `token ${accessToken}`,
        },
      })
    } catch (err) {
      const { status } = err.response
      if (status === 404) throw new NotFoundError("File does not exist")
      if (status === 409)
        throw new ConflictError(
          "File has been changed recently, please try again"
        )
      throw err
    }
  }

  async getRepoInfo(sessionData) {
    const { siteName } = sessionData
    const { accessToken } = sessionData
    const endpoint = `${siteName}`
    const headers = {
      Authorization: `token ${accessToken}`,
    }
    const params = {
      ref: BRANCH_REF,
    }
    // Get the commits of the repo
    const { data } = await this.axiosInstance.get(endpoint, {
      params,
      headers,
    })

    return data
  }

  async getRepoState(sessionData) {
    const { accessToken } = sessionData
    const { siteName } = sessionData
    const endpoint = `${siteName}/commits`
    const headers = {
      Authorization: `token ${accessToken}`,
    }
    const params = {
      ref: BRANCH_REF,
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

  async getLatestCommitOfBranch(sessionData, branch) {
    const { accessToken, siteName } = sessionData
    const endpoint = `${siteName}/commits`
    const headers = {
      Authorization: `token ${accessToken}`,
    }
    const params = {
      ref: branch,
      per_page: 1,
    }
    // Get the commits of the repo
    const { data: commits } = await this.axiosInstance.get(endpoint, {
      params,
      headers,
    })

    const { commit: latestCommit } = commits[0]
    return latestCommit
  }

  async getTree(sessionData, githubSessionData, { isRecursive }) {
    const { accessToken } = sessionData
    const { siteName } = sessionData
    const { treeSha } = githubSessionData.getGithubState()
    const url = `${siteName}/git/trees/${treeSha}`

    const params = {
      ref: BRANCH_REF,
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

  async updateTree(sessionData, githubSessionData, { gitTree, message }) {
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

  async updateRepoState(sessionData, { commitSha }) {
    const { accessToken } = sessionData
    const { siteName } = sessionData
    const refEndpoint = `${siteName}/git/refs/heads/${BRANCH_REF}`
    const headers = {
      Authorization: `token ${accessToken}`,
    }

    await this.axiosInstance.patch(
      refEndpoint,
      { sha: commitSha, force: true },
      { headers }
    )
  }

  async checkHasAccess(sessionData) {
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
      const { status } = err.response
      // If user is unauthorized or site does not exist, show the same NotFoundError
      if (status === 404 || status === 403)
        throw new NotFoundError("Site does not exist")
      throw err
    }
  }
}

module.exports = { GitHubService }
