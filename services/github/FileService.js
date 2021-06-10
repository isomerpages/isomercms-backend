const axios = require("axios")

const {
  ConflictError,
  inputNameConflictErrorMsg,
} = require("@errors/ConflictError")
const { NotFoundError } = require("@errors/NotFoundError")

const validateStatus = require("@utils/axios-utils")

const { GITHUB_ORG_NAME } = process.env
const { BRANCH_REF } = process.env

class FileService {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  getFilePath(fileName, fileDir) {
    return `https://api.github.com/repos/${GITHUB_ORG_NAME}/${
      this.siteName
    }/contents/${fileDir ? `${fileDir}/${fileName}` : fileName}`
  }

  async create(fileName, content, fileDir) {
    try {
      const endpoint = this.getFilePath(fileName, fileDir)
      const encodedContent = Base64.encode(content)

      const params = {
        message: `Create file: ${fileName}`,
        encodedContent,
        branch: BRANCH_REF,
      }

      const resp = await axios.put(endpoint, params, {
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json",
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

  async read(fileName, fileDir) {
    const endpoint = this.getFilePath(fileName, fileDir)

    const params = {
      ref: BRANCH_REF,
    }

    const resp = await axios.get(endpoint, {
      validateStatus,
      params,
      headers: {
        Authorization: `token ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    })
    if (resp.status === 404) throw new NotFoundError("File does not exist")

    const { content: encodedContent, sha } = resp.data
    const content = Base64.decode(encodedContent)

    return { content, sha }
  }

  async update(fileName, newContent, fileDir, sha) {
    try {
      const endpoint = this.getFilePath(fileName, fileDir)
      const encodedNewContent = Base64.encode(newContent)
      
      let fileSha = sha
      if (!sha) {
        const { sha:retrievedSha } = await this.read(fileName, fileDir)
        fileSha = retrievedSha
      }

      const params = {
        message: `Update file: ${fileName}`,
        encodedNewContent,
        branch: BRANCH_REF,
        fileSha,
      }

      const resp = await axios.put(endpoint, params, {
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      return { newSha: resp.data.commit.sha }
    } catch (err) {
      const { status } = err.response
      if (status === 404) throw new NotFoundError("File does not exist")
      throw err
    }
  }

  async delete(fileName, fileDir, sha) {
    try {
      const endpoint = this.getFilePath(fileName, fileDir)

      let fileSha = sha
      if (!sha) {
        const { sha:retrievedSha } = await this.read(fileName, fileDir)
        fileSha = retrievedSha
      }

      const params = {
        message: `Delete file: ${fileName}`,
        branch: BRANCH_REF,
        fileSha,
      }

      await axios.delete(endpoint, {
        params,
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      })
    } catch (err) {
      const { status } = err.response
      if (status === 404) throw new NotFoundError("File does not exist")
      throw err
    }
  }
}

module.exports = {
  FileService
}