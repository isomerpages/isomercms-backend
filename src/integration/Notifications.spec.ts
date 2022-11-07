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
import { getAuthorizationMiddleware } from "@root/middleware"
import { NotificationsRouter as _NotificationsRouter } from "@root/routes/v2/authenticated/notifications"
import { SitesRouter as _SitesRouter } from "@root/routes/v2/authenticated/sites"
import { genericGitHubAxiosInstance } from "@root/services/api/AxiosInstance"
import { GitHubService } from "@root/services/db/GitHubService"
import { ConfigYmlService } from "@root/services/fileServices/YmlFileServices/ConfigYmlService"
import CollaboratorsService from "@root/services/identity/CollaboratorsService"
import SitesService from "@root/services/identity/SitesService"
import ReviewRequestService from "@root/services/review/ReviewRequestService"
import {
  getIdentityAuthService,
  getUsersService,
  isomerAdminsService,
  notificationsService,
} from "@services/identity"
import { sequelize } from "@tests/database"

const mockSiteId = "1"
const mockSiteMemberId = "1"

const gitHubService = new GitHubService({
  axiosInstance: genericGitHubAxiosInstance,
})
const identityAuthService = getIdentityAuthService(gitHubService)
const usersService = getUsersService(sequelize)
const configYmlService = new ConfigYmlService({ gitHubService })
const reviewRequestService = new ReviewRequestService(
  gitHubService,
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
subrouter.use("/:siteName", notificationsSubrouter)
const app = generateRouter(subrouter)

describe.skip("Notifications Router", () => {
  const mockAdditionalUserId = "2"
  const mockAdditionalSiteId = "2"
  const mockAdditionalSiteMemberId = "2"
  const mockAnotherSiteMemberId = "3"

  beforeAll(async () => {
    // Set up User and Site table entries
    await User.create({
      id: mockIsomerUserId,
    })
    await User.create({
      id: mockAdditionalUserId,
    })
    await Site.create({
      id: mockSiteId,
      name: mockSiteName,
      apiTokenName: "token",
      jobStatus: "READY",
      siteStatus: "LAUNCHED",
      creatorId: mockIsomerUserId,
    })
    await SiteMember.create({
      userId: mockIsomerUserId,
      siteId: mockSiteId,
      role: "ADMIN",
      id: mockSiteMemberId,
    })
    await Repo.create({
      name: mockSiteName,
      url: "url",
      siteId: mockSiteId,
    })
    await SiteMember.create({
      userId: mockAdditionalUserId,
      siteId: mockSiteId,
      role: "ADMIN",
      id: mockAdditionalSiteMemberId,
    })
    await Site.create({
      id: mockAdditionalSiteId,
      name: mockSiteName,
      apiTokenName: "token",
      jobStatus: "READY",
      siteStatus: "LAUNCHED",
      creatorId: mockIsomerUserId,
    })
    await SiteMember.create({
      userId: mockIsomerUserId,
      siteId: mockAdditionalSiteId,
      role: "ADMIN",
      id: mockAnotherSiteMemberId,
    })
    await Repo.create({
      name: `${mockSiteName}2`,
      url: "url",
      siteId: mockAdditionalSiteId,
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
        siteId: mockSiteId,
        siteMemberId: mockSiteMemberId,
        ...highPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: mockSiteMemberId,
        ...highPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: mockAdditionalUserId,
        siteId: mockSiteId,
        siteMemberId: mockAdditionalSiteMemberId,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockAdditionalSiteId,
        siteMemberId: mockAnotherSiteMemberId,
        ...normalPriorityUnreadNotification,
      })
      const expected = [
        highPriorityReadNotification,
        normalPriorityReadNotification,
        normalPriorityReadNotification,
        normalPriorityReadNotification,
        highPriorityOldReadNotification,
        normalPriorityOldReadNotification,
      ].map((notification) => formatNotification(notification))

      // Act
      const actual = await request(app).get(`/${mockSiteName}`)

      // Assert
      expect(actual.body).toMatchObject(expected)
    })

    it("should return only unread notifications if there are any", async () => {
      // Arrange
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: mockSiteMemberId,
        ...highPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: mockSiteMemberId,
        ...highPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...highPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...highPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockAdditionalUserId,
        siteId: mockSiteId,
        siteMemberId: mockAdditionalSiteMemberId,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockAdditionalSiteId,
        siteMemberId: mockAnotherSiteMemberId,
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
      const actual = await request(app).get(`/${mockSiteName}`)

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
        siteId: mockSiteId,
        siteMemberId: mockSiteMemberId,
        ...highPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: mockSiteMemberId,
        ...highPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...highPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockAdditionalUserId,
        siteId: mockSiteId,
        siteMemberId: mockAdditionalSiteMemberId,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockAdditionalSiteId,
        siteMemberId: mockAnotherSiteMemberId,
        ...normalPriorityUnreadNotification,
      })
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
      const actual = await request(app).get(`/${mockSiteName}/allNotifications`)

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
    it("should return sorted list of all notifications", async () => {
      // Arrange
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: mockSiteMemberId,
        ...highPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: mockSiteMemberId,
        ...highPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityOldReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...highPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityReadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        siteMemberId: 1,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockAdditionalUserId,
        siteId: mockSiteId,
        siteMemberId: mockAdditionalSiteMemberId,
        ...normalPriorityUnreadNotification,
      })
      await Notification.create({
        userId: mockIsomerUserId,
        siteId: mockAdditionalSiteId,
        siteMemberId: mockAnotherSiteMemberId,
        ...normalPriorityUnreadNotification,
      })
      const expected = 200

      // Act
      const actual = await request(app).post(`/${mockSiteName}`).send({})

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
