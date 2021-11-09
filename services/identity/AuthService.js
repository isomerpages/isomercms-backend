class AuthService {
  constructor({ axiosInstance }) {
    this.client = axiosInstance
  }

  async hasAccessToSite(siteName, userId, accessToken) {
    const endpoint = `/${siteName}/collaborators/${userId}`

    try {
      await this.client.get(endpoint, {
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
