const createdTime = new Date()
const readTime = new Date()
const oldReadTime = new Date("1995-12-17T03:24:00")

export const normalPriorityUnreadNotification = {
  message: "low priority unread notification",
  link: "google.com",
  sourceUsername: "user",
  type: "sent_request",
  firstReadTime: null,
  priority: 2,
  createdAt: createdTime,
}

export const normalPriorityReadNotification = {
  ...normalPriorityUnreadNotification,
  message: "low priority read notification",
  firstReadTime: readTime,
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
  firstReadTime: oldReadTime,
}

export const highPriorityOldReadNotification = {
  ...highPriorityReadNotification,
  message: "high priority old notification",
  firstReadTime: oldReadTime,
}

export const formatNotification = (notification: any) => ({
  message: notification.message,
  createdAt: createdTime.toISOString(),
  link: notification.link,
  isRead: !!notification.firstReadTime,
  sourceUsername: notification.sourceUsername,
  type: notification.type,
})
