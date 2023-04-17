import autoBind from "auto-bind"

import {
  statsService as statsServiceInstance,
  StatsService,
} from "@root/services/infra/StatsService"
import { RequestHandler } from "@root/types"

type SideEffect = () => Promise<void> | void

const wrapAsRequestHandler = (sideEffect: SideEffect): RequestHandler => (
  req,
  res,
  next
) => {
  sideEffect()
  next()
}

export class StatsMiddleware {
  private readonly statsService: StatsService

  constructor(statsService: StatsService) {
    this.statsService = statsService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  logVersionNumberCallFor = (version: number, path: string): RequestHandler => (
    _req,
    _res,
    next
  ) => {
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

  trackGithubLogins = wrapAsRequestHandler(() =>
    this.statsService.trackGithubLogins()
  )

  trackEmailLogins = wrapAsRequestHandler(() =>
    this.statsService.trackEmailLogins()
  )
}

export const statsMiddleware = new StatsMiddleware(statsServiceInstance)
