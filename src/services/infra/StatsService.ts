/* eslint-disable import/prefer-default-export */
import { Method } from "axios"
import StatsDClient, { StatsD } from "hot-shots"
import { ModelStatic } from "sequelize"

import { config } from "@config/config"

import { Versions, VersionNumber } from "@constants/index"

import { AccessToken, Site, User } from "@root/database/models"

const NPS_VARIANTS = {
  Promoter: "promoter",
  Passive: "passive",
  Detractor: "detractor",
} as const

type NpsVariant = typeof NPS_VARIANTS[keyof typeof NPS_VARIANTS]

const getNpsVariant = (rating: number): NpsVariant => {
  if (rating >= 9) return "promoter"
  if (rating >= 7) return "passive"
  return "detractor"
}

export class StatsService {
  readonly statsD: StatsD

  private readonly usersRepo: ModelStatic<User>

  private readonly accessTokenRepo: ModelStatic<AccessToken>

  private readonly sitesRepo: ModelStatic<Site>

  constructor(
    statsDClient: StatsD,
    usersRepo: ModelStatic<User>,
    accessTokenRepo: ModelStatic<AccessToken>,
    sitesRepo: ModelStatic<Site>
  ) {
    this.statsD = statsDClient
    this.usersRepo = usersRepo
    this.accessTokenRepo = accessTokenRepo
    this.sitesRepo = sitesRepo
  }

  submitApiVersionCount = (version: VersionNumber, path: string) => {
    this.statsD.increment(`versions.${version}`, {
      version,
      path,
    })
  }

  countDbUsers = async () => {
    // NOTE: Track only active users.
    const numUsers = await this.usersRepo.count({
      where: {
        deletedAt: null,
      },
    })

    // NOTE: Technically our e2e user will be here also
    // but over-counting by 1 here is acceptable.
    this.statsD.distribution("users.email.current", numUsers, 1, {
      version: Versions.V2,
    })
  }

  countMigratedSites = async () => {
    const numMigratedSites = await this.sitesRepo.count({
      where: {
        deletedAt: null,
      },
    })

    this.statsD.distribution("sites.db.all", numMigratedSites, 1)
  }

  trackGithubLogins = (version: VersionNumber) => {
    this.statsD.increment("users.github.login", {
      version,
    })
  }

  trackNpsRating = (rating: number, tags: Record<string, string>) => {
    const npsVariant = getNpsVariant(rating)
    this.statsD.distribution("users.feedback.nps", rating, 1, {
      ...tags,
      npsVariant,
    })
  }

  trackEmailLogins = () => {
    this.statsD.increment("users.email.login", {
      version: Versions.V2,
    })
  }

  incrementGithubApiCall = (method: string, site: string) => {
    this.statsD.increment("users.github.api", {
      site,
      // NOTE: Allowed to pass in lowercase,
      // standardised to uppercase for consistency
      method: method.toUpperCase(),
    })
  }
}

const statsDClient = new StatsDClient({
  globalTags: {
    env: config.get("dataDog.env"),
    service: config.get("dataDog.service"),
  },
  prefix: "isomer.",
})
export const statsService = new StatsService(
  statsDClient,
  User,
  AccessToken,
  Site
)
