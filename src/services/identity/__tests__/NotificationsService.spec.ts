import { FindOptions, ModelStatic, Op } from "sequelize"

import { Notification, SiteMember } from "@database/models"
import {
  MOCK_NOTIFICATION_DATE_ONE,
  MOCK_NOTIFICATION_DATE_TWO,
  MOCK_NOTIFICATION_LINK_ONE,
  MOCK_NOTIFICATION_LINK_TWO,
  MOCK_NOTIFICATION_MESSAGE_ONE,
  MOCK_NOTIFICATION_MESSAGE_TWO,
  MOCK_NOTIFICATION_ONE,
  MOCK_NOTIFICATION_SOURCE_USERNAME_ONE,
  MOCK_NOTIFICATION_SOURCE_USERNAME_TWO,
  MOCK_NOTIFICATION_TWO,
  MOCK_NOTIFICATION_TYPE_ONE,
  MOCK_NOTIFICATION_TYPE_TWO,
} from "@fixtures/notifications"
import { mockSiteName, mockUserId } from "@root/fixtures/identity"
import _NotificationsService, {
  NotificationResponse,
} from "@services/identity/NotificationsService"

const MockNotificationsRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
}

const MockSiteMemberRepository = {
  findOne: jest.fn(),
}

const NotificationsService = new _NotificationsService({
  repository: (MockNotificationsRepository as unknown) as ModelStatic<Notification>,
  siteMember: (MockSiteMemberRepository as unknown) as ModelStatic<SiteMember>,
})

const SpyNotificationsService = {
  findAll: jest.spyOn(NotificationsService, "findAll"),
  formatNotifications: jest.spyOn(NotificationsService, "formatNotifications"),
}

const MockNotificationResponseOne: NotificationResponse = {
  message: MOCK_NOTIFICATION_MESSAGE_ONE,
  createdAt: MOCK_NOTIFICATION_DATE_ONE,
  link: MOCK_NOTIFICATION_LINK_ONE,
  isRead: false,
  sourceUsername: MOCK_NOTIFICATION_SOURCE_USERNAME_ONE,
  type: MOCK_NOTIFICATION_TYPE_ONE,
}

const MockNotificationResponseTwo: NotificationResponse = {
  message: MOCK_NOTIFICATION_MESSAGE_TWO,
  createdAt: MOCK_NOTIFICATION_DATE_TWO,
  link: MOCK_NOTIFICATION_LINK_TWO,
  isRead: false,
  sourceUsername: MOCK_NOTIFICATION_SOURCE_USERNAME_TWO,
  type: MOCK_NOTIFICATION_TYPE_TWO,
}

const MockNotificationObject = {
  ...MOCK_NOTIFICATION_ONE,
  update: jest.fn(),
}

describe("NotificationsService", () => {
  // Prevent inter-test pollution of mocks
  afterEach(() => jest.clearAllMocks())

  describe("formatNotifications", () => {
    it("should format array of Notification to array of NotificationResponse successfully", () => {
      // Arrange
      const expected = [
        MockNotificationResponseOne,
        MockNotificationResponseTwo,
      ]

      // Act
      const actual = NotificationsService.formatNotifications([
        MOCK_NOTIFICATION_ONE,
        MOCK_NOTIFICATION_TWO,
      ])

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should return an empty array if no notifications are passed in", () => {
      // Act
      const actual = NotificationsService.formatNotifications([])

      // Assert
      expect(actual).toEqual([])
    })
  })

  describe("findAll", () => {
    it("should return all notifications that match the given query", async () => {
      // Arrange
      const mockFindOptions: FindOptions<Notification> = {
        where: {
          id: {
            [Op.gte]: 1,
          },
        },
      }
      MockNotificationsRepository.findAll.mockResolvedValueOnce([
        MOCK_NOTIFICATION_ONE,
        MOCK_NOTIFICATION_TWO,
      ])

      // Act
      await NotificationsService.findAll({
        siteName: mockSiteName,
        userId: mockUserId,
        findOptions: mockFindOptions,
      })

      // Assert
      expect(MockNotificationsRepository.findAll).toHaveBeenCalled()
    })
  })

  describe("listRecent", () => {
    it("should return array of formatted unread notifications", async () => {
      // Arrange
      const expected = [
        MockNotificationResponseOne,
        MockNotificationResponseTwo,
      ]
      MockNotificationsRepository.findAll.mockResolvedValueOnce([
        MOCK_NOTIFICATION_ONE,
        MOCK_NOTIFICATION_TWO,
      ])

      // Act
      const actual = await NotificationsService.listRecent({
        siteName: mockSiteName,
        userId: mockUserId,
      })

      // Assert
      expect(actual).toEqual(expected)
      expect(SpyNotificationsService.findAll).toHaveBeenCalledTimes(1)
      expect(SpyNotificationsService.formatNotifications).toHaveBeenCalledTimes(
        1
      )
      expect(MockNotificationsRepository.findAll).toHaveBeenCalledTimes(1)
    })

    it("should return array of recent notifications if they are all already read", async () => {
      // Arrange
      const expected = [
        MockNotificationResponseOne,
        MockNotificationResponseTwo,
      ]
      MockNotificationsRepository.findAll.mockResolvedValueOnce([])
      MockNotificationsRepository.findAll.mockResolvedValueOnce([
        MOCK_NOTIFICATION_ONE,
        MOCK_NOTIFICATION_TWO,
      ])

      // Act
      const actual = await NotificationsService.listRecent({
        siteName: mockSiteName,
        userId: mockUserId,
      })

      // Assert
      expect(actual).toEqual(expected)
      expect(SpyNotificationsService.findAll).toHaveBeenCalledTimes(2)
      expect(SpyNotificationsService.formatNotifications).toHaveBeenCalledTimes(
        1
      )
      expect(MockNotificationsRepository.findAll).toHaveBeenCalledTimes(2)
    })

    it("should return an empty array of recent notifications if none are found", async () => {
      // Arrange
      MockNotificationsRepository.findAll.mockResolvedValueOnce([])
      MockNotificationsRepository.findAll.mockResolvedValueOnce([])

      // Act
      const actual = await NotificationsService.listRecent({
        siteName: mockSiteName,
        userId: mockUserId,
      })

      // Assert
      expect(actual).toEqual([])
      expect(SpyNotificationsService.findAll).toHaveBeenCalledTimes(2)
      expect(SpyNotificationsService.formatNotifications).toHaveBeenCalledTimes(
        1
      )
      expect(MockNotificationsRepository.findAll).toHaveBeenCalledTimes(2)
    })
  })

  describe("listAll", () => {
    it("should return all notifications successfully", async () => {
      // Arrange
      const expected = [
        MockNotificationResponseOne,
        MockNotificationResponseTwo,
      ]
      MockNotificationsRepository.findAll.mockResolvedValueOnce([
        MOCK_NOTIFICATION_ONE,
        MOCK_NOTIFICATION_TWO,
      ])

      // Act
      const actual = await NotificationsService.listAll({
        siteName: mockSiteName,
        userId: mockUserId,
      })

      // Assert
      expect(actual).toEqual(expected)
      expect(SpyNotificationsService.findAll).toHaveBeenCalledTimes(1)
      expect(SpyNotificationsService.formatNotifications).toHaveBeenCalledTimes(
        1
      )
    })
  })

  describe("markNotificationsAsRead", () => {
    it("should mark notifications as read successfully", async () => {
      // Arrange
      MockSiteMemberRepository.findOne.mockResolvedValueOnce({
        id: 1,
      })
      MockNotificationsRepository.update.mockResolvedValueOnce(undefined)

      // Act
      await NotificationsService.markNotificationsAsRead({
        siteName: mockSiteName,
        userId: mockUserId,
      })

      // Assert
      expect(MockSiteMemberRepository.findOne).toHaveBeenCalledTimes(1)
      expect(MockNotificationsRepository.update).toHaveBeenCalledTimes(1)
    })
  })

  describe("create", () => {
    it("should create a new notification entry if there are no recent target notifications", async () => {
      // Arrange
      MockSiteMemberRepository.findOne.mockResolvedValueOnce({
        id: 1,
        siteId: 1,
      })
      MockNotificationsRepository.findOne.mockResolvedValueOnce(undefined)
      MockNotificationsRepository.create.mockResolvedValueOnce(undefined)

      // Act
      await NotificationsService.create({
        siteName: mockSiteName,
        userId: mockUserId,
        link: MOCK_NOTIFICATION_LINK_ONE,
        notificationType: MOCK_NOTIFICATION_TYPE_ONE,
        notificationSourceUsername: MOCK_NOTIFICATION_SOURCE_USERNAME_ONE,
      })

      // Assert
      expect(MockSiteMemberRepository.findOne).toHaveBeenCalledTimes(1)
      expect(MockNotificationsRepository.findOne).toHaveBeenCalledTimes(1)
      expect(MockNotificationsRepository.create).toHaveBeenCalledTimes(1)
    })

    it("should update an existing notification entry if it exists", async () => {
      // Arrange
      MockSiteMemberRepository.findOne.mockResolvedValueOnce({
        id: 1,
        siteId: 1,
      })
      MockNotificationsRepository.findOne.mockResolvedValueOnce(
        MockNotificationObject
      )
      MockNotificationsRepository.update.mockResolvedValueOnce(undefined)

      // Act
      await NotificationsService.create({
        siteName: mockSiteName,
        userId: mockUserId,
        link: MOCK_NOTIFICATION_LINK_ONE,
        notificationType: MOCK_NOTIFICATION_TYPE_ONE,
        notificationSourceUsername: MOCK_NOTIFICATION_SOURCE_USERNAME_ONE,
      })

      // Assert
      expect(MockSiteMemberRepository.findOne).toHaveBeenCalledTimes(1)
      expect(MockNotificationsRepository.findOne).toHaveBeenCalledTimes(1)
      expect(MockNotificationObject.update).toHaveBeenCalledTimes(1)
    })
  })
})
