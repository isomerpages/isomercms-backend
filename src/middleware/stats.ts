import autoBind from "auto-bind"

import { VERSION_NUMBERS } from "@root/constants"
import logger from "@root/logger/logger"
import {
  statsService as statsServiceInstance,
  StatsService,
} from "@root/services/infra/StatsService"
import { RequestHandler } from "@root/types"

type SideEffect = () => Promise<void>
const wrapAsRequestHandler = (sideEffect: SideEffect): RequestHandler => (
  req,
  res,
  next
) => {
  sideEffect().catch(logger.info)
  next()
}

export class StatsMiddleware {
  private readonly statsService: StatsService

  constructor(statsService: StatsService) {
    this.statsService = statsService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  logVersionNumberCallFor = (
    version: VERSION_NUMBERS,
    path: string
  ): RequestHandler => (_req, _res, next) => {
    this.statsService.submitApiVersionCount(version, path)
    next()
  }

  countDbUsers = wrapAsRequestHandler(() => this.statsService.countDbUsers())

  countGithubSites = wrapAsRequestHandler(() =>
    this.statsService.countGithubSites()
  )

  countMigratedSites = wrapAsRequestHandler(() =>
    this.statsService.countMigratedSites()
  )

  trackGithubLogins = wrapAsRequestHandler(async () =>
    this.statsService.trackGithubLogins()
  )

  trackEmailLogins = wrapAsRequestHandler(async () =>
    this.statsService.trackEmailLogins()
  )
}

export const statsMiddleware = new StatsMiddleware(statsServiceInstance)
