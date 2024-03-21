import autoBind from "auto-bind"

import { VersionNumber, Versions } from "@root/constants"
import baseLogger from "@root/logger/logger"
import {
  statsService as statsServiceInstance,
  StatsService,
} from "@root/services/infra/StatsService"
import { RequestHandler } from "@root/types"

const logger = baseLogger.child({ module: "stats" })

type SideEffect = () => Promise<void>
const wrapAsRequestHandler = (sideEffect: SideEffect): RequestHandler => (
  req,
  res,
  next
) => {
  sideEffect().catch((err) =>
    logger.error("Error in stats middleware", { error: err, params: {} })
  )
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
    version: VersionNumber,
    path: string
  ): RequestHandler => (_req, _res, next) => {
    this.statsService.submitApiVersionCount(version, path)
    next()
  }

  countDbUsers = wrapAsRequestHandler(() => this.statsService.countDbUsers())

  countMigratedSites = wrapAsRequestHandler(() =>
    this.statsService.countMigratedSites()
  )

  trackV2GithubLogins = wrapAsRequestHandler(async () =>
    this.statsService.trackGithubLogins(Versions.V2)
  )

  trackEmailLogins = wrapAsRequestHandler(async () =>
    this.statsService.trackEmailLogins()
  )
}

export const statsMiddleware = new StatsMiddleware(statsServiceInstance)
