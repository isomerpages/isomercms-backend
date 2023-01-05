import express from "express"
import request from "supertest"

import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import { NotificationsRouter as _NotificationsRouter } from "@routes/v2/authenticatedSites/notifications"

import { generateRouter } from "@fixtures/app"
import { mockSiteName, mockIsomerUserId } from "@fixtures/sessionData"
import NotificationsService from "@services/identity/NotificationsService"

describe("Notifications Router", () => {
  const mockNotificationsService = {
    listRecent: jest.fn(),
    listAll: jest.fn(),
    markNotificationsAsRead: jest.fn(),
  }

  const NotificationsRouter = new _NotificationsRouter({
    notificationsService: (mockNotificationsService as unknown) as NotificationsService,
  })

  const subrouter = express()

  // We can use read route handler here because we don't need to lock the repo
  subrouter.get(
    "/:siteName/notifications/",
    attachReadRouteHandlerWrapper(NotificationsRouter.getRecentNotifications)
  )
  subrouter.get(
    "/:siteName/notifications/allNotifications",
    attachReadRouteHandlerWrapper(NotificationsRouter.getAllNotifications)
  )
  subrouter.post(
    "/:siteName/notifications/",
    attachReadRouteHandlerWrapper(NotificationsRouter.markNotificationsAsRead)
  )

  const app = generateRouter(subrouter)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getRecentNotifications", () => {
    it("should call the underlying service when there is a GET request", async () => {
      // Arrange
      const mockNotificationsValue: never[] = []
      mockNotificationsService.listRecent.mockResolvedValueOnce(
        mockNotificationsValue
      )

      // Act
      const resp = await request(app)
        .get(`/${mockSiteName}/notifications/`)
        .expect(200)

      // Assert
      expect(resp.body).toStrictEqual(mockNotificationsValue)
      expect(mockNotificationsService.listRecent).toHaveBeenCalledWith({
        siteName: mockSiteName,
        userId: mockIsomerUserId,
      })
    })
  })

  describe("getAllNotifications", () => {
    it("should call the underlying service when there is a GET request", async () => {
      // Arrange
      const mockNotificationsValue: never[] = []
      mockNotificationsService.listAll.mockResolvedValueOnce(
        mockNotificationsValue
      )

      // Act
      const resp = await request(app)
        .get(`/${mockSiteName}/notifications/allNotifications`)
        .expect(200)

      // Assert
      expect(resp.body).toStrictEqual(mockNotificationsValue)
      expect(mockNotificationsService.listAll).toHaveBeenCalledWith({
        siteName: mockSiteName,
        userId: mockIsomerUserId,
      })
    })
  })

  describe("markNotificationsAsRead", () => {
    it("should call the underlying service when there is a POST request", async () => {
      // Arrange
      const mockRequestBody = {}

      // Act
      await request(app)
        .post(`/${mockSiteName}/notifications/`)
        .send(mockRequestBody)
        .expect(200)

      // Assert
      expect(
        mockNotificationsService.markNotificationsAsRead
      ).toHaveBeenCalledWith({
        siteName: mockSiteName,
        userId: mockIsomerUserId,
      })
    })
  })
})
