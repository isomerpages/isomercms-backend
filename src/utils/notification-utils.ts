import moment from "moment"

export type NotificationType =
  | "sent_request"
  | "updated_request"
  | "request_created"
  | "request_approved"
  | "request_cancelled"

export const getNotificationExpiryDate = (
  notificationType: NotificationType
) => {
  switch (notificationType) {
    case "request_created":
    case "request_approved":
    case "request_cancelled":
      // Always notify for review request information
      return moment()
    default:
      return moment().subtract(3, "hours")
  }
}

export const getNotificationMessage = (
  notificationType: NotificationType,
  sourceUsername: string
) => {
  switch (notificationType) {
    case "sent_request":
      return `${sourceUsername} has sent you a review request.`
    case "request_created":
      return `${sourceUsername} created a review request.`
    case "request_approved":
      return `${sourceUsername} has approved a review request.`
    case "request_cancelled":
      return `${sourceUsername} has cancelled a review request.`
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
