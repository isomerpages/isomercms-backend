import autoBind from "auto-bind"
import express from "express"

import {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
} from "@middleware/routeHandler"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { attachSiteHandler } from "@root/middleware"
import { AuthorizationMiddleware } from "@root/middleware/authorization"
import { RequestHandler } from "@root/types"
import { nameAnonymousMethods } from "@root/utils/apm-utils"
import NotificationsService, {
  NotificationResponse,
} from "@services/identity/NotificationsService"

interface NotificationsRouterProps {
  notificationsService: NotificationsService
  authorizationMiddleware: AuthorizationMiddleware
}

// eslint-disable-next-line import/prefer-default-export
export class NotificationsRouter {
  private readonly notificationsService

  private readonly authorizationMiddleware

  constructor({
    notificationsService,
    authorizationMiddleware,
  }: NotificationsRouterProps) {
    this.notificationsService = notificationsService
    this.authorizationMiddleware = authorizationMiddleware
    nameAnonymousMethods(this)
    autoBind(this)
  }

  getRecentNotifications: RequestHandler<
    never,
    NotificationResponse[],
    unknown,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    const { siteName, isomerUserId: userId } = userWithSiteSessionData

    const notifications = await this.notificationsService.listRecent({
      siteName,
      userId,
    })
    return res.status(200).json(notifications)
  }

  getAllNotifications: RequestHandler<
    never,
    NotificationResponse[],
    unknown,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    const { siteName, isomerUserId: userId } = userWithSiteSessionData

    const notifications = await this.notificationsService.listAll({
      siteName,
      userId,
    })
    return res.status(200).json(notifications)
  }

  markNotificationsAsRead: RequestHandler<
    never,
    unknown,
    unknown,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    const { siteName, isomerUserId: userId } = userWithSiteSessionData

    await this.notificationsService.markNotificationsAsRead({
      siteName,
      userId,
    })
    return res.status(200).send("OK")
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })
    router.use(attachSiteHandler)
    router.use(this.authorizationMiddleware.verifySiteMember)

    router.get("/", attachReadRouteHandlerWrapper(this.getRecentNotifications))
    router.get(
      "/allNotifications",
      attachReadRouteHandlerWrapper(this.getAllNotifications)
    )
    router.post(
      "/",
      attachWriteRouteHandlerWrapper(this.markNotificationsAsRead)
    )

    return router
  }
}
