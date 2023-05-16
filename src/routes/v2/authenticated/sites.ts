/* eslint-disable import/prefer-default-export */
import autoBind from "auto-bind"
import express from "express"

import type { AuthorizationMiddleware } from "@middleware/authorization"
import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import type UserSessionData from "@root/classes/UserSessionData"
import { BaseIsomerError } from "@root/errors/BaseError"
import { attachSiteHandler } from "@root/middleware"
import { StatsMiddleware } from "@root/middleware/stats"
import type { RequestHandler } from "@root/types"
import type SitesService from "@services/identity/SitesService"

type SitesRouterProps = {
  sitesService: SitesService
  authorizationMiddleware: AuthorizationMiddleware
  statsMiddleware: StatsMiddleware
}

export class SitesRouter {
  private readonly sitesService

  private readonly authorizationMiddleware

  private readonly statsMiddleware

  constructor({
    sitesService,
    authorizationMiddleware,
    statsMiddleware,
  }: SitesRouterProps) {
    this.sitesService = sitesService
    this.authorizationMiddleware = authorizationMiddleware
    this.statsMiddleware = statsMiddleware
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
    if (possibleStagingUrl.isErr()) {
      return res.status(404).json({ message: possibleStagingUrl.error.message })
    }
    return res.status(200).json({ stagingUrl: possibleStagingUrl.value })
  }

  getSiteUrl: RequestHandler<
    { siteName: string },
    unknown,
    never,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    return this.sitesService
      .getSiteUrl(userWithSiteSessionData)
      .map((siteUrl) => res.status(200).json({ siteUrl }))
      .mapErr((err) => res.status(404).json({ message: err.message }))
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
    if (possibleSiteInfo.isErr()) {
      return res.status(400).json({ message: possibleSiteInfo.error.message })
    }
    return res.status(200).json(possibleSiteInfo.value)
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get(
      "/",
      this.statsMiddleware.countMigratedSites,
      attachReadRouteHandlerWrapper(this.getSites)
    )
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
