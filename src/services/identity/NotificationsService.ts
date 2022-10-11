import { ModelStatic, Op } from "sequelize"

import { Notification, Site, Repo, SiteMember } from "@database/models"
import {
  NotificationType,
  getNotificationExpiryDate,
  getNotificationMessage,
  getNotificationPriority,
} from "@root/utils/notification-utils"

const NUM_RECENT_NOTIFICATIONS = 6

interface NotificationsServiceProps {
  repository: ModelStatic<Notification>
  siteMember: ModelStatic<SiteMember>
}

class NotificationsService {
  // NOTE: Explicitly specifying using keyed properties to ensure
  // that the types are synced.
  private readonly repository: NotificationsServiceProps["repository"]

  private readonly siteMember: NotificationsServiceProps["siteMember"]

  constructor({ repository, siteMember }: NotificationsServiceProps) {
    this.repository = repository
    this.siteMember = siteMember
  }

  formatNotifications(notifications: Notification[]) {
    return notifications.map((notification) => ({
      message: notification.message,
      createdAt: notification.createdAt,
      link: notification.link,
      isRead: !!notification.firstReadTime,
      sourceUsername: notification.sourceUsername,
      type: notification.type,
    }))
  }

  async listRecent({ siteName, userId }: { siteName: string; userId: string }) {
    const newNotifications = await this.repository.findAll({
      where: {
        user_id: userId,
        first_read_time: {
          [Op.eq]: null,
        },
      },
      order: [
        ["first_read_time", "DESC NULLS FIRST"],
        ["priority", "ASC"],
      ],
      include: [
        {
          model: Site,
          as: "site",
          required: true,
          include: [
            {
              model: Repo,
              required: true,
              where: {
                name: siteName,
              },
            },
          ],
        },
      ],
    })

    if (newNotifications.length > 0)
      return this.formatNotifications(newNotifications)

    const mostRecentNotifications = await this.repository.findAll({
      where: {
        user_id: userId,
      },
      order: [
        ["first_read_time", "DESC NULLS FIRST"],
        ["priority", "ASC"],
      ],
      limit: NUM_RECENT_NOTIFICATIONS,
      include: [
        {
          model: Site,
          as: "site",
          required: true,
          include: [
            {
              model: Repo,
              required: true,
              where: {
                name: siteName,
              },
            },
          ],
        },
      ],
    })

    return this.formatNotifications(mostRecentNotifications)
  }

  async listAll({ siteName, userId }: { siteName: string; userId: string }) {
    const notifications = await this.repository.findAll({
      where: {
        user_id: userId,
      },
      order: [
        ["first_read_time", "DESC NULLS FIRST"],
        ["priority", "ASC"],
      ],
      include: [
        {
          model: Site,
          as: "site",
          required: true,
          include: [
            {
              model: Repo,
              required: true,
              where: {
                name: siteName,
              },
            },
          ],
        },
      ],
    })

    return this.formatNotifications(notifications)
  }

  async markNotificationsAsRead({
    siteName,
    userId,
  }: {
    siteName: string
    userId: string
  }) {
    const siteMember = await this.siteMember.findOne({
      where: { user_id: userId },
      include: [
        {
          model: Site,
          required: true,
          include: [
            {
              model: Repo,
              required: true,
              where: {
                name: siteName,
              },
            },
          ],
        },
      ],
    })
    const readAtDate = new Date()
    await this.repository.update(
      {
        firstReadTime: readAtDate,
      },
      {
        where: {
          site_member_id: siteMember?.id,
          first_read_time: null,
        },
      }
    )
  }

  async create({
    siteName,
    userId,
    link,
    notificationType,
    notificationSourceUsername,
  }: {
    siteName: string
    userId: string
    link: string
    notificationType: NotificationType
    notificationSourceUsername: string
  }) {
    const siteMember = await this.siteMember.findOne({
      where: { user_id: userId },
      include: [
        {
          model: Site,
          required: true,
          include: [
            {
              model: Repo,
              required: true,
              where: {
                name: siteName,
              },
            },
          ],
        },
      ],
    })
    const recentTargetNotification = await this.repository.findOne({
      where: {
        user_id: userId,
        type: notificationType,
        created_at: {
          [Op.gte]: getNotificationExpiryDate(notificationType),
        },
        link,
        source_username: notificationSourceUsername,
      },
      include: [
        {
          model: Site,
          as: "site",
          required: true,
          include: [
            {
              model: Repo,
              required: true,
              where: {
                name: siteName,
              },
            },
          ],
        },
      ],
    })

    if (recentTargetNotification) {
      // Update existing notification
      await recentTargetNotification.update({
        firstReadTime: null,
        createdAt: new Date(),
      })
    } else {
      // Create new notification
      await this.repository.create({
        siteMemberId: siteMember?.id,
        siteId: siteMember?.siteId,
        userId,
        message: getNotificationMessage(
          notificationType,
          notificationSourceUsername
        ), // helper method here
        link,
        sourceUsername: notificationSourceUsername,
        type: notificationType,
        firstReadTime: null,
        priority: getNotificationPriority(notificationType), // get priority
      })
    }
  }
}

export default NotificationsService
