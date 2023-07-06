/* eslint-disable import/prefer-default-export */
import autoBind from "auto-bind"
import express from "express"
import { fromPromise } from "neverthrow"

import type { AuthorizationMiddleware } from "@middleware/authorization"
import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import type UserSessionData from "@root/classes/UserSessionData"
import { attachSiteHandler } from "@root/middleware"
import { StatsMiddleware } from "@root/middleware/stats"
import InfraService from "@root/services/infra/InfraService"
import type { RequestHandler } from "@root/types"
import { ResponseErrorBody } from "@root/types/dto/error"
import { ProdPermalink, StagingPermalink } from "@root/types/pages"
import { RepositoryData } from "@root/types/repoInfo"
import { SiteInfo, SiteLaunchDto } from "@root/types/siteInfo"
import type SitesService from "@services/identity/SitesService"

type SitesRouterProps = {
  sitesService: SitesService
  infraService: InfraService
  authorizationMiddleware: AuthorizationMiddleware
  statsMiddleware: StatsMiddleware
}

// eslint-disable-next-line import/prefer-default-export
export class SitesRouter {
  private readonly sitesService

  private readonly authorizationMiddleware

  private readonly statsMiddleware

  private readonly infraService

  constructor({
    sitesService,
    authorizationMiddleware,
    statsMiddleware,
    infraService,
  }: SitesRouterProps) {
    this.sitesService = sitesService
    this.authorizationMiddleware = authorizationMiddleware
    this.statsMiddleware = statsMiddleware
    this.infraService = infraService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  getSites: RequestHandler<
    never,
    { siteNames: RepositoryData[] },
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
    { lastUpdated: string },
    never,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    const lastUpdated = this.sitesService.getLastUpdated(
      userWithSiteSessionData
    )
    return res.status(200).json({ lastUpdated })
  }

  getStagingUrl: RequestHandler<
    { siteName: string },
    { stagingUrl: StagingPermalink } | ResponseErrorBody,
    never,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    return this.sitesService
      .getStagingUrl(userWithSiteSessionData)
      .map((stagingUrl) => res.status(200).json({ stagingUrl }))
      .mapErr(({ message }) => res.status(400).json({ message }))
  }

  getSiteUrl: RequestHandler<
    { siteName: string },
    { siteUrl: ProdPermalink } | ResponseErrorBody,
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

  getSiteLaunchInfo: RequestHandler<
    { siteName: string },
    SiteLaunchDto | ResponseErrorBody,
    never,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    const result = await this.infraService.getSiteLaunchStatus(
      userWithSiteSessionData
    )
    if (result.isOk()) {
      return res.status(200).json(result.value)
    }
    return res.status(404).json({ message: result.error.message })
  }

  launchSite: RequestHandler<
    { siteName: string },
    SiteLaunchDto | ResponseErrorBody,
    { siteUrl: string; useWwwSubdomain: boolean },
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = (req, res) => {
    const { userWithSiteSessionData } = res.locals
    const { email } = userWithSiteSessionData
    // Note, launching the site is an async operation,
    // so we should not have any await here
    this.infraService.launchSiteFromCms({
      email,
      siteName: req.params.siteName,
      primaryDomain: req.body.siteUrl,
      useWww: req.body.useWwwSubdomain,
    })
    return res
      .status(200)
      .json({ message: `Site launch for ${req.params.siteName} started` })
  }

  getSiteInfo: RequestHandler<
    { siteName: string },
    SiteInfo | ResponseErrorBody,
    never,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals

    return this.sitesService
      .getSiteInfo(userWithSiteSessionData)
      .map((siteInfo) => res.status(200).json(siteInfo))
      .mapErr(({ message }) => res.status(400).json({ message }))
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
    router.get(
      "/:siteName/launchInfo",
      attachSiteHandler,
      this.authorizationMiddleware.verifySiteMember,
      attachReadRouteHandlerWrapper(this.getSiteLaunchInfo)
    )
    router.post(
      "/:siteName/launchSite",
      attachSiteHandler,
      this.authorizationMiddleware.verifySiteMember,
      attachReadRouteHandlerWrapper(this.launchSite)
    )
    return router
  }
}
