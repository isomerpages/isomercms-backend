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
import { generateRouterForUserWithSite } from "@fixtures/app"
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
import { genericGitHubAxiosInstance } from "@root/services/api/AxiosInstance"
import { GitHubService } from "@root/services/db/GitHubService"
import { BaseDirectoryService } from "@root/services/directoryServices/BaseDirectoryService"
import { ResourceRoomDirectoryService } from "@root/services/directoryServices/ResourceRoomDirectoryService"
import { CollectionPageService } from "@root/services/fileServices/MdPageServices/CollectionPageService"
import { ContactUsPageService } from "@root/services/fileServices/MdPageServices/ContactUsPageService"
import { HomepagePageService } from "@root/services/fileServices/MdPageServices/HomepagePageService"
import { PageService } from "@root/services/fileServices/MdPageServices/PageService"
import { ResourcePageService } from "@root/services/fileServices/MdPageServices/ResourcePageService"
import { SubcollectionPageService } from "@root/services/fileServices/MdPageServices/SubcollectionPageService"
import { UnlinkedPageService } from "@root/services/fileServices/MdPageServices/UnlinkedPageService"
import { CollectionYmlService } from "@root/services/fileServices/YmlFileServices/CollectionYmlService"
import { ConfigService } from "@root/services/fileServices/YmlFileServices/ConfigService"
import { ConfigYmlService } from "@root/services/fileServices/YmlFileServices/ConfigYmlService"
import { FooterYmlService } from "@root/services/fileServices/YmlFileServices/FooterYmlService"
import CollaboratorsService from "@root/services/identity/CollaboratorsService"
import PreviewService from "@root/services/identity/PreviewService"
import { SitesCacheService } from "@root/services/identity/SitesCacheService"
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
const footerYmlService = new FooterYmlService({ gitHubService })
const collectionYmlService = new CollectionYmlService({ gitHubService })
const baseDirectoryService = new BaseDirectoryService({ gitHubService })

const contactUsService = new ContactUsPageService({
  gitHubService,
  footerYmlService,
})
const collectionPageService = new CollectionPageService({
  gitHubService,
  collectionYmlService,
})
const subCollectionPageService = new SubcollectionPageService({
  gitHubService,
  collectionYmlService,
})
const homepageService = new HomepagePageService({ gitHubService })
const resourcePageService = new ResourcePageService({ gitHubService })
const unlinkedPageService = new UnlinkedPageService({ gitHubService })
const resourceRoomDirectoryService = new ResourceRoomDirectoryService({
  baseDirectoryService,
  configYmlService,
  gitHubService,
})
const pageService = new PageService({
  collectionPageService,
  contactUsService,
  subCollectionPageService,
  homepageService,
  resourcePageService,
  unlinkedPageService,
  resourceRoomDirectoryService,
})
const configService = new ConfigService()
const reviewRequestService = new ReviewRequestService(
  (gitHubService as unknown) as typeof ReviewApi,
  User,
  ReviewRequest,
  Reviewer,
  ReviewMeta,
  ReviewRequestView,
  pageService,
  configService
)
// Using a mock SitesCacheService as the actual service has setInterval
// which causes tests to not exit.
const MockSitesCacheService = {
  getLastUpdated: jest.fn(),
}
const MockPreviewService = {}
const sitesService = new SitesService({
  siteRepository: Site,
  gitHubService,
  configYmlService,
  usersService,
  isomerAdminsService,
  reviewRequestService,
  sitesCacheService: (MockSitesCacheService as unknown) as SitesCacheService,
  previewService: (MockPreviewService as unknown) as PreviewService,
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
