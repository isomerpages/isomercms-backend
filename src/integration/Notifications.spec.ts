import express from "express"
import request from "supertest"

import {
  Notification,
  Repo,
  Reviewer,
  ReviewMeta,
  ReviewRequest,
  ReviewRequestView,
  Site,
  SiteMember,
  User,
  Whitelist,
} from "@database/models"
import { generateRouter, generateRouterForUserWithSite } from "@fixtures/app"
import UserSessionData from "@root/classes/UserSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
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
import { getAuthorizationMiddleware } from "@root/middleware"
import { NotificationsRouter as _NotificationsRouter } from "@root/routes/v2/authenticated/notifications"
import { SitesRouter as _SitesRouter } from "@root/routes/v2/authenticated/sites"
import { genericGitHubAxiosInstance } from "@root/services/api/AxiosInstance"
import { GitHubService } from "@root/services/db/GitHubService"
import { ConfigYmlService } from "@root/services/fileServices/YmlFileServices/ConfigYmlService"
import CollaboratorsService from "@root/services/identity/CollaboratorsService"
import SitesService from "@root/services/identity/SitesService"
import ReviewRequestService from "@root/services/review/ReviewRequestService"
import * as ReviewApi from "@services/db/review"
import {
  getIdentityAuthService,
  getUsersService,
  isomerAdminsService,
  notificationsService,
} from "@services/identity"
import { sequelize } from "@tests/database"

const MOCK_SITE = "mockSite"
const MOCK_SITE_ID = "1"
const MOCK_SITE_MEMBER_ID = "1"

const gitHubService = new GitHubService({
  axiosInstance: genericGitHubAxiosInstance,
})
const identityAuthService = getIdentityAuthService(gitHubService)
const usersService = getUsersService(sequelize)
const configYmlService = new ConfigYmlService({ gitHubService })
const reviewRequestService = new ReviewRequestService(
  (gitHubService as unknown) as typeof ReviewApi,
  User,
  ReviewRequest,
  Reviewer,
  ReviewMeta,
  ReviewRequestView
)
const sitesService = new SitesService({
  siteRepository: Site,
  gitHubService,
  configYmlService,
  usersService,
  isomerAdminsService,
  reviewRequestService,
})
const collaboratorsService = new CollaboratorsService({
  siteRepository: Site,
  siteMemberRepository: SiteMember,
  sitesService,
  usersService,
  whitelist: Whitelist,
})
const authorizationMiddleware = getAuthorizationMiddleware({
  identityAuthService,
  usersService,
  isomerAdminsService,
  collaboratorsService,
})
const notificationsRouter = new _NotificationsRouter({
  notificationsService,
  authorizationMiddleware,
})
const notificationsSubrouter = notificationsRouter.getRouter()

// Set up express with defaults and use the router under test
const subrouter = express()

subrouter.use("/:siteName", notificationsSubrouter)
const userSessionData = new UserSessionData({
  isomerUserId: mockIsomerUserId,
  email: mockEmail,
})
const app = generateRouterForUserWithSite(subrouter, userSessionData, MOCK_SITE)

describe("Notifications Router", () => {
  const MOCK_ADDITIONAL_USER_ID = "2"
  const MOCK_ADDITIONAL_SITE_ID = "2"
  const MOCK_ADDITIONAL_SITE_MEMBER_ID = "2"
  const MOCK_ANOTHER_SITE_MEMBER_ID = "3"

  beforeAll(async () => {
    // We need to force the relevant tables to start from a clean slate
    // Otherwise, some tests may fail due to the auto-incrementing IDs
    // not starting from 1
    await User.sync({ force: true })
    await Site.sync({ force: true })
    await Repo.sync({ force: true })
    await SiteMember.sync({ force: true })
    await Notification.sync({ force: true })

    // Set up User and Site table entries
    await User.create({
      id: mockIsomerUserId,
    })
    await User.create({
      id: MOCK_ADDITIONAL_USER_ID,
    })
    await Site.create({
      id: MOCK_SITE_ID,
      name: mockSiteName,
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
      name: MOCK_SITE,
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
      name: `${mockSiteName}2`,
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
      name: `${MOCK_SITE}2`,
      url: "url",
      siteId: MOCK_ADDITIONAL_SITE_ID,
    })
  })

  afterAll(async () => {
    await Notification.sync({ force: true })
    await SiteMember.sync({ force: true })
    await Site.sync({ force: true })
    await User.sync({ force: true })
    await Repo.sync({ force: true })
  })

  describe("GET /", () => {
    afterEach(async () => {
      // Clean up so that different tests using
      // the same notifications don't interfere with each other
      await Notification.sync({ force: true })
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
      const actual = await request(app).get(`/${MOCK_SITE}`)

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
      const actual = await request(app).get(`/${MOCK_SITE}`)

      // Assert
      expect(actual.body).toMatchObject(expected)
    })
  })

  describe("GET /allNotifications", () => {
    afterEach(async () => {
      // Clean up so that different tests using
      // the same notifications don't interfere with each other
      await Notification.sync({ force: true })
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
      const actual = await request(app).get(`/${MOCK_SITE}/allNotifications`)

      // Assert
      expect(actual.body).toMatchObject(expected)
    })
  })

  describe("POST /", () => {
    afterEach(async () => {
      // Clean up so that different tests using
      // the same notifications don't interfere with each other
      await Notification.sync({ force: true })
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
      const actual = await request(app).post(`/${MOCK_SITE}`).send({})

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
