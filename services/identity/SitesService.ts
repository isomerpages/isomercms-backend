import { ModelStatic, ValidationError } from "sequelize"

import logger from "@logger/logger"

import { BadRequestError } from "@errors/BadRequestError"

import { Site } from "@database/models"

export interface SitesServiceProps {
  repository: ModelStatic<Site>
}

export interface CreateSiteProps {
  repositoryName: string
  createdBy?: string
  agency?: string
  siteName?: string
  contact?: string
  repositoryUrl?: string
  hostingId?: string
  stagingUrl?: string
  productionUrl?: string
  liveDomain?: string
  redirectFrom?: string[]
  uptimeId?: string
  uptimeUrl?: string
  launchedAt?: string
  launchedBy?: string
}

export interface UpdateSiteProps {
  repositoryName?: string // Don't allow null
  createdBy?: string | null
  agency?: string | null
  siteName?: string | null
  contact?: string | null
  repositoryUrl?: string | null
  hostingId?: string | null
  stagingUrl?: string | null
  productionUrl?: string | null
  liveDomain?: string | null
  redirectFrom?: string[] | null
  uptimeId?: string | null
  uptimeUrl?: string | null
  launchedAt?: string | null
  launchedBy?: string | null
}

class SitesService {
  // NOTE: Explicitly specifying using keyed properties to ensure
  // that the types are synced.
  private readonly repository: SitesServiceProps["repository"]

  constructor({ repository }: SitesServiceProps) {
    this.repository = repository
  }

  async createSite(props: CreateSiteProps): Promise<Site> {
    try {
      return await Site.create(props as never) // Work-around for sequelize's useless type checking
    } catch (err) {
      if (err instanceof ValidationError) {
        const items = err.errors.map((item) => item.message).join(", ")
        throw new BadRequestError(`${err}: ${items}`)
      } else {
        throw err
      }
    }
  }

  async getByRepositoryName(repositoryName: string): Promise<Site | null> {
    return this.repository.findOne({
      where: { repositoryName },
    })
  }

  async updateSite(
    repositoryName: string,
    props: UpdateSiteProps
  ): Promise<Site | null> {
    try {
      const [affectedRows, data] = await this.repository.update(props, {
        where: { repositoryName },
        returning: true,
      })

      if (affectedRows === 0) {
        return null
      }
      if (affectedRows === 1) {
        return data[0]
      }
      throw new Error(`Updated ${affectedRows} sites (expected 1).`)
    } catch (err) {
      if (err instanceof ValidationError) {
        const items = err.errors.map((item) => item.message).join(", ")
        throw new BadRequestError(`${err}: ${items}`)
      } else {
        throw err
      }
    }
  }
}

export default SitesService
