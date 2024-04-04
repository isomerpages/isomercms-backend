import { ResultAsync } from "neverthrow"
import { FindOptions, ModelStatic, Op, Sequelize } from "sequelize"

import { Notification, Site, Repo, SiteMember } from "@database/models"
import DatabaseError from "@root/errors/DatabaseError"
import logger from "@root/logger/logger"
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

export interface NotificationResponse {
  message: string
  createdAt: Date
  link: string
  isRead: boolean
  sourceUsername: string
  type: string
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

  findAllForSite({
    siteName,
    findOptions,
  }: {
    siteName: string
    findOptions?: FindOptions<Notification>
  }): ResultAsync<Notification[], DatabaseError> {
    return ResultAsync.fromPromise(
      this.repository.findAll({
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
        ...findOptions,
      }),
      (error) => {
        logger.error(
          `Error finding notifications for site ${siteName}: ${JSON.stringify(
            error
          )}`
        )

        return new DatabaseError(
          `Error finding notifications for site ${siteName}`
        )
      }
    )
  }

  async findAll({
    siteName,
    userId,
    findOptions,
  }: {
    siteName: string
    userId: string
    findOptions?: FindOptions<Notification>
  }) {
    // We want separate sorting for unread notifications and read notifications - for unread, high priority notifications should go first
    // while for read, newer notifications should be displayed first, regardless of priority
    // The second sort criteria only affects unread notifications and is used to allow high priority notifications to be sorted first (priority > created_at)
    // Read notifications are unaffected by the second sort criteria and will continue to be sorted in the remaining order (first_read_time > created_at > priority)
    return this.repository.findAll({
      where: {
        user_id: userId,
      },
      order: [
        ["first_read_time", "DESC NULLS FIRST"],
        [
          Sequelize.literal(
            "CASE WHEN first_read_time IS NULL THEN priority ELSE 999 END"
          ),
          "ASC",
        ],
        ["created_at", "DESC"],
        ["priority", "ASC"], // Low numbers indicate a higher priority
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
      ...findOptions,
    })
  }

  async listRecent({ siteName, userId }: { siteName: string; userId: string }) {
    const newNotifications = await this.findAll({
      siteName,
      userId,
      findOptions: {
        where: {
          userId,
          firstReadTime: {
            [Op.eq]: null,
          },
        },
      },
    })

    if (newNotifications.length > 0)
      return this.formatNotifications(newNotifications)

    const mostRecentNotifications = await this.findAll({
      siteName,
      userId,
      findOptions: {
        limit: NUM_RECENT_NOTIFICATIONS,
      },
    })

    return this.formatNotifications(mostRecentNotifications)
  }

  async listAll({ siteName, userId }: { siteName: string; userId: string }) {
    const notifications = await this.findAll({
      siteName,
      userId,
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
    siteMember,
    link,
    notificationType,
    notificationSourceUsername,
  }: {
    siteMember: SiteMember
    link: string
    notificationType: NotificationType
    notificationSourceUsername: string
  }) {
    const recentTargetNotification = await this.repository.findOne({
      where: {
        user_id: siteMember.userId,
        site_id: siteMember.siteId,
        type: notificationType,
        created_at: {
          [Op.gte]: getNotificationExpiryDate(notificationType),
        },
        link,
        source_username: notificationSourceUsername,
      },
    })

    if (recentTargetNotification) {
      // Update existing notification
      // createdAt is a special column which must be flagged as changed
      recentTargetNotification.changed("createdAt", true)
      await recentTargetNotification.update(
        {
          firstReadTime: null,
          createdAt: new Date(),
          message: getNotificationMessage(
            notificationType,
            notificationSourceUsername
          ),
        },
        { raw: true }
      )
    } else {
      // Create new notification
      await this.repository.create({
        siteMemberId: siteMember?.id,
        siteId: siteMember?.siteId,
        userId: siteMember.userId,
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
