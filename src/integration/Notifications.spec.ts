import express from "express"
import request from "supertest"

import { NotificationsRouter as _NotificationsRouter } from "@routes/v2/authenticatedSites/notifications"

import { Notification, Repo, Site, SiteMember, User } from "@database/models"
import { generateRouter } from "@fixtures/app"
import UserSessionData from "@root/classes/UserSessionData"
import {
  formatNotification,
  highPriorityOldReadNotification,
  highPriorityReadNotification,
  highPriorityUnreadNotification,
  normalPriorityOldReadNotification,
  normalPriorityReadNotification,
  normalPriorityUnreadNotification,
} from "@root/fixtures/notifications"
import {
  mockEmail,
  mockIsomerUserId,
  mockSiteName,
} from "@root/fixtures/sessionData"
import { SitesRouter as _SitesRouter } from "@root/routes/v2/authenticated/sites"
import { notificationsService } from "@services/identity"

const MOCK_SITE = "mockSite"
const MOCK_SITE_ID = "1"
const MOCK_SITE_MEMBER_ID = "1"

const notificationsRouter = new _NotificationsRouter({ notificationsService })
const notificationsSubrouter = notificationsRouter.getRouter()

// Set up express with defaults and use the router under test
const subrouter = express()
// As we set certain properties on res.locals when the user signs in using github
// In order to do integration testing, we must expose a middleware
// that allows us to set this properties also
subrouter.use((req, res, next) => {
  const userSessionData = new UserSessionData({
    isomerUserId: mockIsomerUserId,
    email: mockEmail,
  })
  res.locals.userSessionData = userSessionData
  next()
})
subrouter.use(notificationsSubrouter)
const app = generateRouter(subrouter)

describe("Notifications Router", () => {
  const MOCK_ADDITIONAL_USER_ID = "2"
  const MOCK_ADDITIONAL_SITE_ID = "2"
  const MOCK_ADDITIONAL_SITE_MEMBER_ID = "2"
  const MOCK_ANOTHER_SITE_MEMBER_ID = "3"

  beforeAll(async () => {
    // Set up User and Site table entries
    await User.create({
      id: mockIsomerUserId,
    })
    await User.create({
      id: MOCK_ADDITIONAL_USER_ID,
    })
    await Site.create({
      id: MOCK_SITE_ID,
      name: MOCK_SITE,
      apiTokenName: "token",
      jobStatus: "READY",
      siteStatus: "LAUNCHED",
      creatorId: mockIsomerUserId,
    })
    await SiteMember.create({
      userId: mockIsomerUserId,
      siteId: MOCK_SITE_ID,
      role: "ADMIN",
      id: MOCK_SITE_MEMBER_ID,
    })
    await Repo.create({
      name: mockSiteName,
      url: "url",
      siteId: MOCK_SITE_ID,
    })
    await SiteMember.create({
      userId: MOCK_ADDITIONAL_USER_ID,
      siteId: MOCK_SITE_ID,
      role: "ADMIN",
      id: MOCK_ADDITIONAL_SITE_MEMBER_ID,
    })
    await Site.create({
      id: MOCK_ADDITIONAL_SITE_ID,
      name: MOCK_SITE,
      apiTokenName: "token",
      jobStatus: "READY",
      siteStatus: "LAUNCHED",
      creatorId: mockIsomerUserId,
    })
    await SiteMember.create({
      userId: mockIsomerUserId,
      siteId: MOCK_ADDITIONAL_SITE_ID,
      role: "ADMIN",
      id: MOCK_ANOTHER_SITE_MEMBER_ID,
    })
    await Repo.create({
      name: `${mockSiteName}2`,
      url: "url",
      siteId: MOCK_ADDITIONAL_SITE_ID,
    })
  })
  describe("GET /", () => {
    afterEach(async () => {
      // Clean up so that different tests using
      // the same notifications don't interfere with each other
      await Notification.destroy({
        where: {},
      })
    })
    it("should return sorted list of most recent notifications if there are no unread", async () => {
      // Arrange
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: MOCK_SITE_MEMBER_ID,
        ...highPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: MOCK_SITE_MEMBER_ID,
        ...highPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: MOCK_ADDITIONAL_USER_ID,
        siteId: MOCK_SITE_ID,
        siteMemberId: MOCK_ADDITIONAL_SITE_MEMBER_ID,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_ADDITIONAL_SITE_ID,
        siteMemberId: MOCK_ANOTHER_SITE_MEMBER_ID,
        ...normalPriorityUnreadNotification,
      })
      // Notifications with different user or site are not returned
      const expected = [
        highPriorityReadNotification,
        normalPriorityReadNotification,
        normalPriorityReadNotification,
        normalPriorityReadNotification,
        highPriorityOldReadNotification,
        normalPriorityOldReadNotification,
      ].map((notification) => formatNotification(notification))

      // Act
      const actual = await request(app).get("/")

      // Assert
      expect(actual.body).toMatchObject(expected)
    })

    it("should return only unread notifications if there are any", async () => {
      // Arrange
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: MOCK_SITE_MEMBER_ID,
        ...highPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: MOCK_SITE_MEMBER_ID,
        ...highPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...highPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...highPriorityUnreadNotification,
      })
      await Notification.create({
        userId: MOCK_ADDITIONAL_USER_ID,
        siteId: MOCK_SITE_ID,
        siteMemberId: MOCK_ADDITIONAL_SITE_MEMBER_ID,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_ADDITIONAL_SITE_ID,
        siteMemberId: MOCK_ANOTHER_SITE_MEMBER_ID,
        ...normalPriorityUnreadNotification,
      })
      const expected = [
        highPriorityUnreadNotification,
        highPriorityUnreadNotification,
        normalPriorityUnreadNotification,
        normalPriorityUnreadNotification,
        normalPriorityUnreadNotification,
        normalPriorityUnreadNotification,
      ].map((notification) => formatNotification(notification))

      // Act
      const actual = await request(app).get("/")

      // Assert
      expect(actual.body).toMatchObject(expected)
    })
  })

  describe("GET /allNotifications", () => {
    afterEach(async () => {
      // Clean up so that different tests using
      // the same notifications don't interfere with each other
      await Notification.destroy({
        where: {},
      })
    })
    it("should return sorted list of all notifications", async () => {
      // Arrange
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: MOCK_SITE_MEMBER_ID,
        ...highPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: MOCK_SITE_MEMBER_ID,
        ...highPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...highPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: MOCK_ADDITIONAL_USER_ID,
        siteId: MOCK_SITE_ID,
        siteMemberId: MOCK_ADDITIONAL_SITE_MEMBER_ID,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_ADDITIONAL_SITE_ID,
        siteMemberId: MOCK_ANOTHER_SITE_MEMBER_ID,
        ...normalPriorityUnreadNotification,
      })
      // Notifications with different user or site are not returned
      const expected = [
        highPriorityUnreadNotification,
        normalPriorityUnreadNotification,
        highPriorityReadNotification,
        normalPriorityReadNotification,
        normalPriorityReadNotification,
        highPriorityOldReadNotification,
        normalPriorityOldReadNotification,
      ].map((notification) => formatNotification(notification))

      // Act
      const actual = await request(app).get("/allNotifications")

      // Assert
      expect(actual.body).toMatchObject(expected)
    })
  })

  describe("POST /", () => {
    afterEach(async () => {
      // Clean up so that different tests using
      // the same notifications don't interfere with each other
      await Notification.destroy({
        where: {},
      })
    })
    it("should mark all notifications from the user as read", async () => {
      // Arrange
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: MOCK_SITE_MEMBER_ID,
        ...highPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: MOCK_SITE_MEMBER_ID,
        ...highPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...highPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_SITE_ID,
        siteMemberId: 1,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: MOCK_ADDITIONAL_USER_ID,
        siteId: MOCK_SITE_ID,
        siteMemberId: MOCK_ADDITIONAL_SITE_MEMBER_ID,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: MOCK_ADDITIONAL_SITE_ID,
        siteMemberId: MOCK_ANOTHER_SITE_MEMBER_ID,
        ...normalPriorityUnreadNotification,
      })
      const expected = 200

      // Act
      const actual = await request(app).post("/").send({})

      // Assert
      expect(actual.statusCode).toBe(expected)
      expect(
        await Notification.findAll({
          where: { siteMemberId: 1, first_read_time: null },
        })
      ).toEqual([])
    })
  })
})
