const axios = require('axios')
const validateStatus = require('../utils/axios-utils')

// Import error
const { NotFoundError } = require('../errors/NotFoundError')

const GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME
const BRANCH_REF = process.env.BRANCH_REF

class NetlifyToml {
  constructor(accessToken, siteName) {
    this.accessToken = accessToken
    this.siteName = siteName
  }

  async read() {
    try {
      const endpoint = `https://api.github.com/repos/${GITHUB_ORG_NAME}/${this.siteName}/contents/netlify.toml`
      
      const params = {
        "ref": BRANCH_REF,
      }

      const resp = await axios.get(endpoint, {
        validateStatus,
        params,
        headers: {
          Authorization: `token ${this.accessToken}`,
          "Content-Type": "application/json"
        }
      })

      if (resp.status === 404) throw new NotFoundError ('netlify.toml file does not exist')

      const { content, sha } = resp.data
      return { content, sha }

    } catch (err) {
      throw err
    }
  }
}

module.exports = { NetlifyToml }