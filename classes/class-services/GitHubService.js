const axios = require("axios")

const { GITHUB_ORG_NAME } = process.env
const validateStatus = require("@utils/axios-utils")

const GitHubService = {
  /**
   * List all subfolders and files in a directory path
   * @param accessToken {string}
   * @param siteName {string}
   * @param dirPath {string}
   * @returns {Promise<AxiosResponse<any>>}
   */
  list: async (accessToken, siteName, dirPath) => {
    const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/${dirPath}`

    const resp = await axios.get(endpoint, {
      validateStatus,
      headers: {
        Authorization: `token ${accessToken}`,
        "Content-Type": "application/json",
      }
    })

    return resp
  },

  /**
   * Create a file at the specified filepath
   * @param accessToken {string}
   * @param siteName {string}
   * @param filePath {string}
   * @param content {string} B64 encoded content
   * @returns {Promise<AxiosResponse<any>>}
   */
  create: async (accessToken, siteName, filePath, content) => {
    const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/${filePath}`

    const params = {
      message: `Create file: ${filePath}`,
      content
    }

    const resp = await axios.put(endpoint, params, {
      headers: {
        Authorization: `token ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    return resp
  },

  /**
   * Read file content at specified filepath
   * @param accessToken {string}
   * @param siteName {string}
   * @param filePath {string}
   * @returns {Promise<AxiosResponse<any>>}
   */
  read: async (accessToken, siteName, filePath) => {
    const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/${filePath}`

    const resp = await axios.get(endpoint, {
      validateStatus,
      headers: {
        Authorization: `token ${accessToken}`,
        "Content-Type": "application/json",
      }
    })

    return resp
  },

  /**
   * Update file contents
   * @param accessToken {string}
   * @param siteName {string}
   * @param filePath {string}
   * @param content {string} B64 encoded contents
   * @param sha {string}
   * @returns {Promise<AxiosResponse<any>>}
   */
  update: async (accessToken, siteName, filePath, content, sha) => {
    const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/${filePath}`

    const params = {
      message: `Update file: ${filePath}`,
      content,
      sha,
    }

    const resp = await axios.put(endpoint, params, {
      headers: {
        Authorization: `token ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    return resp
  },

  /**
   * Delete file
   * @param accessToken {string}
   * @param siteName {string}
   * @param filePath {string}
   * @param sha {string}
   * @returns {Promise<AxiosResponse<any>>}
   */
  delete: async (accessToken, siteName, filePath, sha) => {
    const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${siteName}/contents/${filePath}`

    const params = {
      message: `Delete file: ${filePath}`,
      sha,
    }

    const resp = await axios.delete(endpoint, {
      params,
      headers: {
        Authorization: `token ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    return resp
  }
}

export default GitHubService