import { Attributes } from "sequelize/types"

import { NotificationType } from "@utils/notification-utils"

import { Notification } from "@database/models"

export const MOCK_NOTIFICATION_MESSAGE_ONE = "Mock notification 1"
export const MOCK_NOTIFICATION_MESSAGE_TWO = "Mock notification 2"

export const MOCK_NOTIFICATION_LINK_ONE = "https://cms.test.gov.sg/link-one"
export const MOCK_NOTIFICATION_LINK_TWO = "https://cms.test.gov.sg/link-two"

export const MOCK_NOTIFICATION_SOURCE_USERNAME_ONE = "mock-user-1"
export const MOCK_NOTIFICATION_SOURCE_USERNAME_TWO = "mock-user-2"

export const MOCK_NOTIFICATION_TYPE_ONE: NotificationType = "sent_request"
export const MOCK_NOTIFICATION_TYPE_TWO: NotificationType = "updated_request"

export const MOCK_NOTIFICATION_DATE_ONE = new Date("2022-09-22T04:07:53Z")
export const MOCK_NOTIFICATION_DATE_TWO = new Date("2022-07-29T03:50:49Z")

export const MOCK_NOTIFICATION_ONE: Attributes<Notification> = {
  id: 1,
  message: MOCK_NOTIFICATION_MESSAGE_ONE,
  link: MOCK_NOTIFICATION_LINK_ONE,
  sourceUsername: MOCK_NOTIFICATION_SOURCE_USERNAME_ONE,
  type: MOCK_NOTIFICATION_TYPE_ONE,
  firstReadTime: null,
  createdAt: MOCK_NOTIFICATION_DATE_ONE,
  updatedAt: MOCK_NOTIFICATION_DATE_ONE,
}

export const MOCK_NOTIFICATION_TWO: Attributes<Notification> = {
  id: 2,
  message: MOCK_NOTIFICATION_MESSAGE_TWO,
  link: MOCK_NOTIFICATION_LINK_TWO,
  sourceUsername: MOCK_NOTIFICATION_SOURCE_USERNAME_TWO,
  type: MOCK_NOTIFICATION_TYPE_TWO,
  firstReadTime: null,
  createdAt: MOCK_NOTIFICATION_DATE_TWO,
  updatedAt: MOCK_NOTIFICATION_DATE_TWO,
}
