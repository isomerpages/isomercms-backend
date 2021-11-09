class SitesService {
  constructor({ repository, tokenStore }) {
    this.repository = repository
    this.tokenStore = tokenStore
  }

  async getBySiteName(siteName) {
    const site = await this.repository.findOne({
      where: { name: siteName },
    })
    return site
  }

  async getSiteAccessToken(siteName) {
    const { apiTokenName } = await this.getBySiteName(siteName)
    const token = await this.tokenStore.getToken(apiTokenName)
    return token
  }
}

module.exports = SitesService
