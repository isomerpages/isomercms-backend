import moment from "moment"

export type NotificationType = "sent_request" | "updated_request"

export const getNotificationExpiryDate = (
  notificationType: NotificationType
) => {
  switch (notificationType) {
    default:
      return moment().subtract(3, "months")
  }
}

export const getNotificationMessage = (
  notificationType: NotificationType,
  sourceUsername: string
) => {
  switch (notificationType) {
    case "sent_request":
      return `${sourceUsername} created a review request.`
    case "updated_request":
      return `${sourceUsername} made changes to a review request.`
    default:
      return "Default notification"
  }
}

export const getNotificationPriority = (notificationType: NotificationType) => {
  switch (notificationType) {
    default:
      return 2
  }
}
