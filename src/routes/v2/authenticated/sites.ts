import autoBind from "auto-bind"
import express from "express"

import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import type UserSessionData from "@root/classes/UserSessionData"
import { attachSiteHandler } from "@root/middleware"
import type { RequestHandler } from "@root/types"
import type SitesService from "@services/identity/SitesService"

type SitesRouterProps = {
  sitesService: SitesService
}

export class SitesRouter {
  private readonly sitesService

  constructor({ sitesService }: SitesRouterProps) {
    this.sitesService = sitesService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  addSiteNameToSessionData(userSessionData: UserSessionData, siteName: string) {
    const { githubId, accessToken, isomerUserId, email } = userSessionData
    return new UserWithSiteSessionData({
      githubId,
      accessToken,
      isomerUserId,
      email,
      siteName,
    })
  }

  getSites: RequestHandler<
    never,
    unknown,
    never,
    never,
    { userSessionData: UserWithSiteSessionData }
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
    { userSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userSessionData } = res.locals
    const { siteName } = req.params
    const userWithSiteSessionData = this.addSiteNameToSessionData(
      userSessionData,
      siteName
    )
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
    { userSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userSessionData } = res.locals
    const { siteName } = req.params
    const userWithSiteSessionData = this.addSiteNameToSessionData(
      userSessionData,
      siteName
    )
    const stagingUrl = await this.sitesService.getStagingUrl(
      userWithSiteSessionData
    )
    return res.status(200).json({ stagingUrl })
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

    return router
  }
}
