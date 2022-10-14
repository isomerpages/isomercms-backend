import { ModelStatic } from "sequelize/types"

import { Notification, SiteMember } from "@root/database/models"
import { mockSiteName, mockUserId } from "@root/fixtures/identity"

import _NotificationsService from "../NotificationsService"

const MockRepository = {
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
}
const MockSiteMember = {
  findOne: jest.fn(),
}

const NotificationsService = new _NotificationsService({
  repository: (MockRepository as unknown) as ModelStatic<Notification>,
  siteMember: (MockSiteMember as unknown) as ModelStatic<SiteMember>,
})

const mockNotifications = [
  {
    message: "one",
    createdAt: "2022-10-04 07:42:31.597857+00",
    link: "link",
    sourceUsername: "blah",
    type: "type",
    isRead: true,
  },
  {
    message: "two",
    createdAt: "2022-10-04 07:42:31.597857+00",
    link: "link",
    sourceUsername: "blah",
    type: "type",
    isRead: true,
  },
  {
    message: "three",
    createdAt: "2022-10-04 07:42:31.597857+00",
    link: "link",
    sourceUsername: "blah",
    type: "type",
    isRead: true,
  },
  {
    message: "four",
    createdAt: "2022-10-04 07:42:31.597857+00",
    link: "link",
    sourceUsername: "blah",
    type: "type",
    isRead: true,
  },
  {
    message: "five",
    createdAt: "2022-10-04 07:42:31.597857+00",
    link: "link",
    sourceUsername: "blah",
    type: "type",
    isRead: true,
  },
  {
    message: "six",
    createdAt: "2022-10-04 07:42:31.597857+00",
    link: "link",
    sourceUsername: "blah",
    type: "type",
    isRead: true,
  },
  {
    message: "seven",
    createdAt: "2022-10-04 07:42:31.597857+00",
    link: "link",
    sourceUsername: "blah",
    type: "type",
    isRead: true,
  },
]

const mockNotificationsResponse = mockNotifications.map((notification) => ({
  ...notification,
  firstReadTime: "yes",
}))

describe("Notification Service", () => {
  afterEach(() => jest.clearAllMocks())

  describe("listRecent", () => {
    afterEach(() => jest.clearAllMocks())
    it("should return the most recent 6 notifications by calling listRecent", async () => {
      // Arrange
      const expected = mockNotifications.slice(0, 6)

      MockRepository.findAll.mockResolvedValueOnce([])
      MockRepository.findAll.mockResolvedValueOnce(
        mockNotificationsResponse.slice(0, 6)
      )

      // Act
      const actual = NotificationsService.listRecent({
        userId: mockUserId,
        siteName: mockSiteName,
      })

      // Assert
      await expect(actual).resolves.toStrictEqual(expected)
      expect(MockRepository.findAll).toHaveBeenCalledTimes(2)
    })

    it("should return the result directly if new notifications available", async () => {
      // Arrange
      const expected = mockNotifications.slice(0, 2)
      MockRepository.findAll.mockResolvedValueOnce(
        mockNotificationsResponse.slice(0, 2)
      )

      // Act
      const actual = NotificationsService.listRecent({
        userId: mockUserId,
        siteName: mockSiteName,
      })

      // Assert
      await expect(actual).resolves.toStrictEqual(expected)
      expect(MockRepository.findAll).toHaveBeenCalledTimes(1)
    })
  })

  it("should return all notifications with listAll", async () => {
    // Arrange
    const expected = mockNotifications
    MockRepository.findAll.mockResolvedValueOnce(mockNotificationsResponse)

    // Act
    const actual = NotificationsService.listAll({
      userId: mockUserId,
      siteName: mockSiteName,
    })

    // Assert
    await expect(actual).resolves.toStrictEqual(expected)
    expect(MockRepository.findAll).toHaveBeenCalledTimes(1)
  })

  it("should update all notifications with markNotificationsAsRead", async () => {
    // Arrange
    MockSiteMember.findOne.mockResolvedValueOnce({ id: mockUserId })
    MockRepository.update.mockResolvedValueOnce({})

    // Act
    const actual = NotificationsService.markNotificationsAsRead({
      userId: mockUserId,
      siteName: mockSiteName,
    })

    // Assert
    await expect(actual).resolves.not.toThrow()
    expect(MockSiteMember.findOne).toHaveBeenCalledTimes(1)
    expect(MockRepository.update).toHaveBeenCalledTimes(1)
  })

  describe("create", () => {
    const mockSiteMember = ({
      userId: mockUserId,
      siteId: 1,
    } as unknown) as SiteMember
    it("should create a new notification if no similar one exists", async () => {
      // Arrange
      MockSiteMember.findOne.mockResolvedValueOnce({ id: mockUserId })
      MockRepository.findOne.mockResolvedValueOnce(null)

      // Act
      const actual = NotificationsService.create({
        siteMember: mockSiteMember,
        link: "link",
        notificationType: "sent_request",
        notificationSourceUsername: "user",
      })

      // Assert
      await expect(actual).resolves.not.toThrow()
      expect(MockRepository.findOne).toHaveBeenCalledTimes(1)
      expect(MockRepository.create).toHaveBeenCalledTimes(1)
    })

    it("should update an existing notification if a similar one exists", async () => {
      // Arrange
      const notificationUpdate = jest.fn()
      MockSiteMember.findOne.mockResolvedValueOnce({ id: mockUserId })
      MockRepository.findOne.mockResolvedValueOnce({
        update: notificationUpdate,
        changed: jest.fn(),
      })

      // Act
      const actual = NotificationsService.create({
        siteMember: mockSiteMember,
        link: "link",
        notificationType: "sent_request",
        notificationSourceUsername: "user",
      })

      // Assert
      await expect(actual).resolves.not.toThrow()
      expect(MockRepository.findOne).toHaveBeenCalledTimes(1)
      expect(notificationUpdate).toHaveBeenCalledTimes(1)
    })
  })
})
