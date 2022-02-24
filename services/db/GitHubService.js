const axios = require("axios")

const validateStatus = require("@utils/axios-utils")

const BRANCH_REF = "staging"

const {
  ConflictError,
  inputNameConflictErrorMsg,
} = require("@errors/ConflictError")
const { NotFoundError } = require("@errors/NotFoundError")

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
    { accessToken, siteName },
    { content, fileName, directoryName, isMedia = false }
  ) {
    try {
      const endpoint = this.getFilePath({ siteName, fileName, directoryName })
      // Validation and sanitisation of media already done
      const encodedContent = isMedia ? content : Base64.encode(content)

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

  async read({ accessToken, siteName }, { fileName, directoryName }) {
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

  async readMedia({ accessToken, siteName }, { fileSha }) {
    /**
     * Files that are bigger than 1 MB needs to be retrieved
     * via Github Blob API. The content can only be retrieved through
     * the `sha` of the file.
     */
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

  async readDirectory({ accessToken, siteName }, { directoryName }) {
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

  async update(
    { accessToken, siteName },
    { fileContent, sha, fileName, directoryName }
  ) {
    try {
      const endpoint = this.getFilePath({ siteName, fileName, directoryName })
      const encodedNewContent = Base64.encode(fileContent)

      let fileSha = sha
      if (!sha) {
        const { sha: retrievedSha } = await this.read(
          { accessToken, siteName },
          { fileName, directoryName }
        )
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

  async delete({ accessToken, siteName }, { sha, fileName, directoryName }) {
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
      if (status === 409)
        throw new ConflictError(
          "File has been changed recently, please try again"
        )
      throw err
    }
  }

  async getRepoInfo({ accessToken, siteName }) {
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

  async getRepoState({ accessToken, siteName }) {
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

  async getTree({ accessToken, siteName, treeSha }, { isRecursive }) {
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

  async updateTree(
    { accessToken, currentCommitSha, treeSha, siteName },
    { gitTree, message }
  ) {
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

  async updateRepoState({ accessToken, siteName }, { commitSha }) {
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
}

module.exports = { GitHubService }
