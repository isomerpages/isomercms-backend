const axios = require("axios")
const validateStatus = require("../utils/axios-utils")

// Import error
const { NotFoundError } = require("../errors/NotFoundError")

const { GITHUB_BUILD_ORG_NAME } = process.env
const { GITHUB_BUILD_REPO_NAME } = process.env

class NetlifyToml {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async read() {
    const endpoint = `https://api.github.com/repos/${GITHUB_BUILD_ORG_NAME}/${GITHUB_BUILD_REPO_NAME}/contents/netlify.toml`

    const resp = await axios.get(endpoint, {
      validateStatus,
      headers: {
        Authorization: `token ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (resp.status === 404)
      throw new NotFoundError("netlify.toml file does not exist")

    const { content, sha } = resp.data
    return { content, sha }
  }
}

module.exports = { NetlifyToml }
