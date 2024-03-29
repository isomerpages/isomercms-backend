import { Attributes } from "sequelize"

import type { Notification } from "@database/models"

const CREATED_TIME = new Date()
const READ_TIME = new Date()
const OLD_READ_TIME = new Date("1995-12-17T03:24:00")

export const normalPriorityUnreadNotification = {
  message: "low priority unread notification",
  link: "google.com",
  sourceUsername: "user",
  type: "sent_request",
  firstReadTime: null,
  priority: 2,
  createdAt: CREATED_TIME,
}

export const normalPriorityReadNotification = {
  ...normalPriorityUnreadNotification,
  message: "low priority read notification",
  firstReadTime: READ_TIME,
}

export const highPriorityUnreadNotification = {
  ...normalPriorityUnreadNotification,
  message: "high priority unread notification",
  priority: 1,
}

export const highPriorityReadNotification = {
  ...normalPriorityReadNotification,
  message: "high priority read notification",
  priority: 1,
}

export const normalPriorityOldReadNotification = {
  ...normalPriorityReadNotification,
  message: "low priority old notification",
  firstReadTime: OLD_READ_TIME,
}

export const highPriorityOldReadNotification = {
  ...highPriorityReadNotification,
  message: "high priority old notification",
  firstReadTime: OLD_READ_TIME,
}

export const formatNotification = (notification: Attributes<Notification>) => ({
  message: notification.message,
  createdAt: CREATED_TIME.toISOString(),
  link: notification.link,
  isRead: !!notification.firstReadTime,
  sourceUsername: notification.sourceUsername,
  type: notification.type,
})
