/* eslint-disable import/prefer-default-export */
import autoBind from "auto-bind"
import express from "express"

import type { AuthorizationMiddleware } from "@middleware/authorization"
import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import type UserSessionData from "@root/classes/UserSessionData"
import { attachSiteHandler } from "@root/middleware"
import { RouteCheckerMiddleware } from "@root/middleware/routeChecker"
import { StatsMiddleware } from "@root/middleware/stats"
import InfraService from "@root/services/infra/InfraService"
import RepoCheckerService from "@root/services/review/RepoCheckerService"
import type { RequestHandler } from "@root/types"
import { ResponseErrorBody } from "@root/types/dto/error"
import { ProdPermalink, StagingPermalink } from "@root/types/pages"
import { PreviewInfo } from "@root/types/previewInfo"
import { RepositoryData } from "@root/types/repoInfo"
import { RepoErrorDto } from "@root/types/siteChecker"
import { SiteInfo, SiteLaunchDto } from "@root/types/siteInfo"
import { StagingBuildStatus } from "@root/types/stagingBuildStatus"
import type SitesService from "@services/identity/SitesService"

type SitesRouterProps = {
  sitesService: SitesService
  infraService: InfraService
  authorizationMiddleware: AuthorizationMiddleware
  statsMiddleware: StatsMiddleware
  repoCheckerService: RepoCheckerService
}

// eslint-disable-next-line import/prefer-default-export
export class SitesRouter {
  private readonly sitesService

  private readonly authorizationMiddleware

  private readonly statsMiddleware

  private readonly infraService

  private readonly repoCheckerService

  constructor({
    sitesService,
    authorizationMiddleware,
    statsMiddleware,
    infraService,
    repoCheckerService,
  }: SitesRouterProps) {
    this.sitesService = sitesService
    this.authorizationMiddleware = authorizationMiddleware
    this.statsMiddleware = statsMiddleware
    this.infraService = infraService
    this.repoCheckerService = repoCheckerService
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

  getPreviewInfo: RequestHandler<
    { siteName: string },
    PreviewInfo[] | ResponseErrorBody,
    { sites: string[]; email: string },
    never,
    { userSessionData: UserSessionData }
  > = async (req, res) =>
    this.sitesService
      .getSitesPreview(req.body.sites, res.locals.userSessionData)
      .then((previews) => res.status(200).json(previews))

  getUserStagingSiteBuildStatus: RequestHandler<
    { siteName: string },
    StagingBuildStatus | ResponseErrorBody,
    never,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    const result = await this.sitesService.getUserStagingSiteBuildStatus(
      userWithSiteSessionData
    )
    if (result.isOk()) {
      return res.status(200).json(result.value)
    }
    return res.status(404).json({ message: "Unable to get staging status" })
  }

  getLinkCheckerStatus: RequestHandler<
    { siteName: string },
    RepoErrorDto | ResponseErrorBody,
    never,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    const result = await this.repoCheckerService.checkRepo(
      userWithSiteSessionData.siteName
    )
    if (result.isOk()) {
      return res.status(200).json(result.value)
    }
    return res.status(400).json({ status: "error" })
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })
    const routeCheckerMiddleware = new RouteCheckerMiddleware()

    router.get(
      "/",
      this.statsMiddleware.countMigratedSites,
      attachReadRouteHandlerWrapper(this.getSites)
    )
    router.get(
      "/:siteName/lastUpdated",
      routeCheckerMiddleware.verifySiteName,
      attachSiteHandler,
      attachReadRouteHandlerWrapper(this.getLastUpdated)
    )
    router.get(
      "/:siteName/stagingUrl",
      routeCheckerMiddleware.verifySiteName,
      attachSiteHandler,
      attachReadRouteHandlerWrapper(this.getStagingUrl)
    )
    router.get(
      "/:siteName/siteUrl",
      routeCheckerMiddleware.verifySiteName,
      attachSiteHandler,
      attachReadRouteHandlerWrapper(this.getSiteUrl)
    )
    router.get(
      "/:siteName/info",
      routeCheckerMiddleware.verifySiteName,
      attachSiteHandler,
      this.authorizationMiddleware.verifySiteMember,
      attachReadRouteHandlerWrapper(this.getSiteInfo)
    )
    router.get(
      "/:siteName/launchInfo",
      routeCheckerMiddleware.verifySiteName,
      attachSiteHandler,
      this.authorizationMiddleware.verifySiteMember,
      attachReadRouteHandlerWrapper(this.getSiteLaunchInfo)
    )
    router.post(
      "/:siteName/launchSite",
      routeCheckerMiddleware.verifySiteName,
      attachSiteHandler,
      this.authorizationMiddleware.verifySiteAdmin,
      attachReadRouteHandlerWrapper(this.launchSite)
    )
    router.get(
      "/:siteName/getStagingBuildStatus",
      routeCheckerMiddleware.verifySiteName,
      attachSiteHandler,
      this.authorizationMiddleware.verifySiteMember,
      attachReadRouteHandlerWrapper(this.getUserStagingSiteBuildStatus)
    )
    router.get(
      "/:siteName/getLinkCheckerStatus",
      routeCheckerMiddleware.verifySiteName,
      attachSiteHandler,
      this.authorizationMiddleware.verifySiteMember,
      attachReadRouteHandlerWrapper(this.getLinkCheckerStatus)
    )

    // The /sites/preview is a POST endpoint as the frontend sends
    // a list of sites to obtain previews for. This is to support
    // GitHub login users who we don't have the list of sites for
    // users in the db. However, using GET endpoint without sending
    // a list of sites is ideal for caching of responses. Should all
    // users be migrated to email based login in the future, a db
    // query with session data can be used to obtain list of sites
    // and endpoint can be changed to GET.
    router.post("/preview", attachReadRouteHandlerWrapper(this.getPreviewInfo))

    return router
  }
}
