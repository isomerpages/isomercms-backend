const axios = require("axios")

const ISOMER_GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME

class AuthService {
  async hasAccessToSite(siteName, userId, accessToken) {
    const endpoint = `https://api.github.com/repos/${ISOMER_GITHUB_ORG_NAME}/${siteName}/collaborators/${userId}`

    try {
      await axios.get(endpoint, {
        headers: {
          Authorization: `token ${accessToken}`,
          "Content-Type": "application/json",
        },
      })
      return true
    } catch (err) {
      const { status } = err.response
      if (status === 404 || status === 403) {
        return false
      }
      throw err
    }
  }
}

module.exports = AuthService
