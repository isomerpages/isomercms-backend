const db = require("@database/models")

const IS_LOCAL_DEV = process.env.NODE_ENV === "LOCAL_DEV"

class SiteService {
  constructor(model, tokenService) {
    this.model = model
    this.tokenService = tokenService
  }

  async getBySiteName(siteName) {
    const site = await this.model.findOne({
      where: { name: siteName },
    })
    return site
  }

  async getSiteAccessToken(siteName) {
    const { apiTokenName } = await this.getBySiteName(siteName)
    if (IS_LOCAL_DEV) return process.env.LOCAL_SITE_ACCESS_TOKEN

    if (!this.tokenService) {
      throw new Error("Secret store not configured")
    }
    const token = await this.tokenService.getToken(apiTokenName)
    return token
  }
}

module.exports = new SiteService(db.Site)
