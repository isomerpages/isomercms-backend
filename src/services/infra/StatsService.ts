/* eslint-disable import/prefer-default-export */
import StatsDClient, { StatsD } from "hot-shots"

import { config } from "@config/config"

export class StatsService {
  private readonly statsD: StatsD

  constructor(statsDClient: StatsD) {
    this.statsD = statsDClient
  }

  submitV1Count = () => {
    this.statsD.increment("isomer.versions.v1")
  }
}

const statsDClient = new StatsDClient({
  globalTags: { env: config.get("env"), service: "isomer" },
})
export const statsService = new StatsService(statsDClient)
