import autoBind from "auto-bind"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { SiteMember, User } from "@root/database/models"
import CollaboratorsService from "@root/services/identity/CollaboratorsService"
import NotificationsService from "@root/services/identity/NotificationsService"
import SitesService from "@root/services/identity/SitesService"
import ReviewRequestService from "@root/services/review/ReviewRequestService"
import { RequestHandler } from "@root/types"

export class NotificationOnEditHandler {
  private readonly reviewRequestService: ReviewRequestService

  private readonly sitesService: SitesService

  private readonly collaboratorsService: CollaboratorsService

  private readonly notificationsService: NotificationsService

  constructor({
    reviewRequestService,
    sitesService,
    collaboratorsService,
    notificationsService,
  }: {
    reviewRequestService: ReviewRequestService
    sitesService: SitesService
    collaboratorsService: CollaboratorsService
    notificationsService: NotificationsService
  }) {
    this.reviewRequestService = reviewRequestService
    this.sitesService = sitesService
    this.collaboratorsService = collaboratorsService
    this.notificationsService = notificationsService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  /**
   * Creates a notification. Requires attachSiteHandler as a precondition
   */
  createNotification: RequestHandler<
    never,
    unknown,
    unknown,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res, next) => {
    const { userWithSiteSessionData } = res.locals
    const { siteName, isomerUserId: userId, email } = userWithSiteSessionData
    const site = await this.sitesService.getBySiteName(siteName)
    const users = await this.collaboratorsService.list(siteName, userId)
    if (!site) throw new Error("Site should always exist")
    const reviewRequests = await this.reviewRequestService.listReviewRequest(
      userWithSiteSessionData,
      site
    )
    if (reviewRequests.length === 0) return

    await Promise.all(
      users.map(async (user: User & { SiteMember: SiteMember }) => {
        if (user.id.toString() === userId) return // Don't create notification for the source user
        const { SiteMember: siteMember } = user
        await this.notificationsService.create({
          siteMember,
          link: "TODO",
          notificationType: "updated_request",
          notificationSourceUsername: email,
        })
      })
    )
  }
}
