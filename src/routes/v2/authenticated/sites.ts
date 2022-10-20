import autoBind from "auto-bind"
import express from "express"

import type { AuthorizationMiddleware } from "@middleware/authorization"
import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import type UserSessionData from "@root/classes/UserSessionData"
import { BaseIsomerError } from "@root/errors/BaseError"
import { attachSiteHandler } from "@root/middleware"
import type { RequestHandler } from "@root/types"
import type SitesService from "@services/identity/SitesService"

type SitesRouterProps = {
  sitesService: SitesService
  authorizationMiddleware: AuthorizationMiddleware
}

export class SitesRouter {
  private readonly sitesService

  private readonly authorizationMiddleware

  constructor({ sitesService, authorizationMiddleware }: SitesRouterProps) {
    this.sitesService = sitesService
    this.authorizationMiddleware = authorizationMiddleware
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  getSites: RequestHandler<
    never,
    unknown,
    never,
    never,
    { userSessionData: UserSessionData }
  > = async (req, res) => {
    const { userSessionData } = res.locals
    const siteNames = await this.sitesService.getSites(userSessionData)
    return res.status(200).json({ siteNames })
  }

  getLastUpdated: RequestHandler<
    { siteName: string },
    unknown,
    never,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    const lastUpdated = await this.sitesService.getLastUpdated(
      userWithSiteSessionData
    )
    return res.status(200).json({ lastUpdated })
  }

  getStagingUrl: RequestHandler<
    { siteName: string },
    unknown,
    never,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    const possibleStagingUrl = await this.sitesService.getStagingUrl(
      userWithSiteSessionData
    )

    // Check for error and throw
    if (possibleStagingUrl instanceof BaseIsomerError) {
      return res.status(404).json({ message: possibleStagingUrl.message })
    }
    return res.status(200).json({ stagingUrl: possibleStagingUrl })
  }

  getSiteUrl: RequestHandler<
    { siteName: string },
    unknown,
    never,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    const possibleSiteUrl = await this.sitesService.getSiteUrl(
      userWithSiteSessionData
    )

    // Check for error and throw
    if (possibleSiteUrl instanceof BaseIsomerError) {
      return res.status(404).json({ message: possibleSiteUrl.message })
    }
    return res.status(200).json({ siteUrl: possibleSiteUrl })
  }

  getSiteInfo: RequestHandler<
    { siteName: string },
    unknown,
    never,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals

    const possibleSiteInfo = await this.sitesService.getSiteInfo(
      userWithSiteSessionData
    )

    // Check for error and throw
    if (possibleSiteInfo instanceof BaseIsomerError) {
      return res.status(400).json({ message: possibleSiteInfo.message })
    }
    return res.status(200).json(possibleSiteInfo)
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get("/", attachReadRouteHandlerWrapper(this.getSites))
    router.get(
      "/:siteName/lastUpdated",
      attachSiteHandler,
      attachReadRouteHandlerWrapper(this.getLastUpdated)
    )
    router.get(
      "/:siteName/stagingUrl",
      attachSiteHandler,
      attachReadRouteHandlerWrapper(this.getStagingUrl)
    )
    router.get(
      "/:siteName/siteUrl",
      attachSiteHandler,
      attachReadRouteHandlerWrapper(this.getSiteUrl)
    )
    router.get(
      "/:siteName/info",
      attachSiteHandler,
      this.authorizationMiddleware.verifySiteMember,
      attachReadRouteHandlerWrapper(this.getSiteInfo)
    )

    return router
  }
}
