/* eslint-disable import/prefer-default-export */
import StatsDClient, { StatsD } from "hot-shots"
import _ from "lodash"
import { ModelStatic } from "sequelize"

import { config } from "@config/config"

import {
  Versions,
  GH_MAX_REPO_COUNT,
  GITHUB_ORG_REPOS_ENDPOINT,
  ISOMERPAGES_REPO_PAGE_COUNT,
  VersionNumber,
} from "@constants/index"

import { AccessToken, Site, User } from "@root/database/models"

import { genericGitHubAxiosInstance } from "../api/AxiosInstance"

export class StatsService {
  private readonly statsD: StatsD

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

  countGithubSites = async () => {
    const accessToken = await this.accessTokenRepo.findOne()
    // NOTE: Cannot submit metrics if we are unable to get said metric
    if (!accessToken) return

    const sitesArr = await Promise.all(
      _.fill(Array(ISOMERPAGES_REPO_PAGE_COUNT), null)
        .map((__, idx) => ({
          per_page: GH_MAX_REPO_COUNT,
          sort: "full_name",
          page: idx + 1,
        }))
        .map((params) =>
          genericGitHubAxiosInstance
            .get<unknown[]>(GITHUB_ORG_REPOS_ENDPOINT, {
              params,
            })
            .then(({ data }) => data)
        )
    )

    this.statsD.distribution("sites.github.all", sitesArr.flat().length, 1)
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

  trackEmailLogins = () => {
    this.statsD.increment("users.email.login", {
      version: Versions.V2,
    })
  }

  trackLogout = (version: VersionNumber) => {
    this.statsD.increment("users.logout", {
      version,
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
