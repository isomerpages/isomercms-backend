import autoBind from "auto-bind"

import {
  statsService as statsServiceInstance,
  StatsService,
} from "@root/services/infra/StatsService"
import { RequestHandler } from "@root/types"

// eslint-disable-next-line import/prefer-default-export
export class StatsMiddleware {
  private readonly statsService: StatsService

  constructor(statsService: StatsService) {
    this.statsService = statsService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  logV1CallFor: (path: string) => RequestHandler = (path: string) => (
    _req,
    _res,
    next
  ) => {
    this.statsService.submitV1Count(path)
    next()
  }
}

export const statsMiddleware = new StatsMiddleware(statsServiceInstance)
