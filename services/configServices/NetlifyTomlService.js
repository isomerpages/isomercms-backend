const axios = require("axios")
const toml = require("toml")

// Import error types
const { NotFoundError } = require("@errors/NotFoundError")

const validateStatus = require("@utils/axios-utils")

const { GITHUB_BUILD_ORG_NAME, GITHUB_BUILD_REPO_NAME } = process.env

class NetlifyTomlService {
  async read({ accessToken }) {
    const endpoint = `https://api.github.com/repos/${GITHUB_BUILD_ORG_NAME}/${GITHUB_BUILD_REPO_NAME}/contents/overrides/netlify.toml`

    const resp = await axios.get(endpoint, {
      validateStatus,
      headers: {
        Authorization: `token ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (resp.status === 404)
      throw new NotFoundError("netlify.toml file does not exist")

    const { content } = resp.data

    // Convert to readable form
    const netlifyTomlReadableContent = toml.parse(Base64.decode(content))

    // Headers is an array of objects, specifying a set of access rules for each specified path
    // Under our current assumption, the file only contains a single set of access rules,
    // so we apply the first set of access rules to all paths
    const netlifyTomlHeaderValues = netlifyTomlReadableContent.headers[0].values

    return netlifyTomlHeaderValues
  }
}

module.exports = { NetlifyTomlService }
