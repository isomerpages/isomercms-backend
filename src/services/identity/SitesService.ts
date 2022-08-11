import { ModelStatic } from "sequelize"

import { Site } from "@database/models"

import TokenStore from "./TokenStore"

interface SitesServiceProps {
  repository: ModelStatic<Site>
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

  async getBySiteName(siteName: string): Promise<Site | null> {
    const site = await this.repository.findOne({
      where: { name: siteName },
    })

    return site
  }

  async create(
    createParams: Partial<Site> & {
      name: Site["name"]
      apiTokenName: Site["apiTokenName"]
      creator: Site["site_creator"]
    }
  ) {
    return this.repository.create(createParams)
  }

  async update(updateParams: Partial<Site> & { id: Site["id"] }) {
    return this.repository.update(updateParams, {
      where: { id: updateParams.id },
    })
  }

  async getSiteAccessToken(siteName: string) {
    const site = await this.getBySiteName(siteName)

    if (!site) {
      return null
    }

    const token = await this.tokenStore.getToken(site.apiTokenName)
    return token
  }
}

export default SitesService
