import { Attributes } from "sequelize"

import { Site } from "@database/models"

import TokenStore from "./TokenStore"

interface SitesServiceProps {
  repository: Attributes<Site>
  tokenStore: TokenStore
}

class SitesService {
  // NOTE: Explicitly specifying using keyed properties to ensure
  // that the types are synced.
  private readonly repository: SitesServiceProps["repository"]

  private readonly tokenStore: SitesServiceProps["tokenStore"]

  constructor({ repository, tokenStore }: SitesServiceProps) {
    this.repository = repository
    this.tokenStore = tokenStore
  }

  async getBySiteName(siteName: string) {
    const site = await this.repository.findOne({
      where: { name: siteName },
    })
    return site
  }

  async getSiteAccessToken(siteName: string) {
    const { apiTokenName } = await this.getBySiteName(siteName)
    const token = await this.tokenStore.getToken(apiTokenName)
    return token
  }
}

export default SitesService
