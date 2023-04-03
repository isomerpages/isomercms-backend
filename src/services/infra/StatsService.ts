/* eslint-disable import/prefer-default-export */
import StatsDClient, { StatsD } from "hot-shots"
import { ModelStatic } from "sequelize"

import { config } from "@config/config"

import { User } from "@root/database/models"

export class StatsService {
  private readonly statsD: StatsD

  private readonly usersRepo: ModelStatic<User>

  constructor(statsDClient: StatsD, usersRepo: ModelStatic<User>) {
    this.statsD = statsDClient
    this.usersRepo = usersRepo
  }

  submitV1Count = () => {
    this.statsD.increment("versions.v1", {
      version: "v1",
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
      version: "v2",
    })
  }

  trackGithubLogins = () => {
    this.statsD.increment("users.github.login", {
      version: "v1",
    })
  }

  trackEmailLogins = () => {
    this.statsD.increment("users.email.login", {
      version: "v2",
    })
  }
}

const statsDClient = new StatsDClient({
  globalTags: { env: config.get("env"), service: "isomer" },
  prefix: "isomer.",
})
export const statsService = new StatsService(statsDClient, User)
