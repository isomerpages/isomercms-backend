const axios = require("axios")

const validateStatus = require("@utils/axios-utils")

const BRANCH_REF = "staging"
const { GITHUB_ORG_NAME } = process.env

const {
  ConflictError,
  inputNameConflictErrorMsg,
} = require("@errors/ConflictError")
const { NotFoundError } = require("@errors/NotFoundError")

const axiosInstance = axios.create({
  baseURL: `https://api.github.com/repos/${GITHUB_ORG_NAME}/`,
})

axiosInstance.interceptors.request.use((config) => ({
  ...config,
  headers: {
    ...config.headers,
    "Content-Type": "application/json",
  },
}))

class GitHubService {
  constructor({ axiosInstance }) {
    this.axiosInstance = axiosInstance
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

  getFolderPath({ siteName, directoryName }) {
    const encodedDirPath = directoryName
      .split("/")
      .map((folder) => encodeURIComponent(folder))
      .join("/")
    return `${siteName}/contents/${encodedDirPath}`
  }

  async Create(
    { accessToken, siteName },
    { content, fileName, directoryName }
  ) {
    try {
      const endpoint = this.getFilePath({ siteName, fileName, directoryName })
      const encodedContent = Base64.encode(content)

      const params = {
        message: `Create file: ${fileName}`,
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

  async Read({ accessToken, siteName }, { fileName, directoryName }) {
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

  async ReadDirectory({ accessToken, siteName }, { directoryName }) {
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
    if (resp.status === 404) throw new NotFoundError("File does not exist")

    return resp.data
  }

  async Update(
    { accessToken, siteName },
    { fileContent, sha, fileName, directoryName }
  ) {
    try {
      const endpoint = this.getFilePath({ siteName, fileName, directoryName })
      const encodedNewContent = Base64.encode(fileContent)

      let fileSha = sha
      if (!sha) {
        const { sha: retrievedSha } = await this.Read({
          accessToken,
          fileName,
          directoryName,
        })
        fileSha = retrievedSha
      }

      const params = {
        message: `Update file: ${fileName}`,
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
      const { status } = err.response
      if (status === 404) throw new NotFoundError("File does not exist")
      throw err
    }
  }

  async Delete({ accessToken, siteName }, { sha, fileName, directoryName }) {
    try {
      const endpoint = this.getFilePath({ siteName, fileName, directoryName })

      let fileSha = sha
      if (!sha) {
        const { sha: retrievedSha } = await this.Read({
          accessToken,
          fileName,
          directoryName,
        })
        fileSha = retrievedSha
      }

      const params = {
        message: `Delete file: ${fileName}`,
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
      throw err
    }
  }

  async GetRepoState({ accessToken, siteName }) {
    const endpoint = `${siteName}/commits`
    const headers = {
      Authorization: `token ${accessToken}`,
    }
    const params = {
      ref: BRANCH_REF,
    }
    // Get the commits of the repo
    const { data: commits } = await axios.get(endpoint, {
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

  async GetTree({ accessToken, siteName, treeSha }, { isRecursive }) {
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

  async UpdateTree(
    { accessToken, currentCommitSha, siteName },
    { gitTree, message }
  ) {
    const url = `${siteName}/git/trees`

    const headers = {
      Authorization: `token ${accessToken}`,
    }

    const resp = await this.axiosInstance.post(
      url,
      { tree: gitTree },
      { headers }
    )

    const {
      data: { sha: newTreeSha },
    } = resp

    const commitEndpoint = `${siteName}/git/commits`

    const newCommitResp = await this.axiosInstance.post(
      commitEndpoint,
      {
        message: message || `isomerCMS updated ${siteName} state`,
        tree: newTreeSha,
        parents: [currentCommitSha],
      },
      { headers }
    )

    const newCommitSha = newCommitResp.data.sha

    return newCommitSha
  }

  async UpdateRepoState({ accessToken, siteName }, { commitSha }) {
    const refEndpoint = `${siteName}/git/refs/heads/${BRANCH_REF}`
    const headers = {
      Authorization: `token ${accessToken}`,
    }

    await axiosInstance.patch(
      refEndpoint,
      { sha: commitSha, force: true },
      { headers }
    )
  }
}

module.exports = { GitHubService }
