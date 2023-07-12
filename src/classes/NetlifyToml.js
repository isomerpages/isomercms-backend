import { config } from "@config/config"

const { NotFoundError } = require("@errors/NotFoundError")

const {
  genericGitHubAxiosInstance: axios,
} = require("@root/services/api/AxiosInstance")
const { validateStatus } = require("@root/utils/axios-utils")

// Import error

const GITHUB_BUILD_ORG_NAME = config.get("github.buildOrgName")
const GITHUB_BUILD_REPO_NAME = config.get("github.buildRepo")

class NetlifyToml {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async read() {
    const endpoint = `https://api.github.com/repos/${GITHUB_BUILD_ORG_NAME}/${GITHUB_BUILD_REPO_NAME}/contents/overrides/netlify.toml`

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
