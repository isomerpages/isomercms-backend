import autoBind from "auto-bind"
import express from "express"

import {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
} from "@middleware/routeHandler"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { RequestHandler } from "@root/types"
import NotificationsService, {
  NotificationResponse,
} from "@services/identity/NotificationsService"

interface NotificationsRouterProps {
  notificationsService: NotificationsService
}

// eslint-disable-next-line import/prefer-default-export
export class NotificationsRouter {
  private readonly notificationsService

  constructor({ notificationsService }: NotificationsRouterProps) {
    this.notificationsService = notificationsService
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
