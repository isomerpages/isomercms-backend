import express from "express"
import request from "supertest"

import { NotificationOnEditHandler } from "@middleware/notificationOnEditHandler"

import UserSessionData from "@classes/UserSessionData"

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
import {
  mockEmail,
  mockIsomerUserId,
  mockSiteName,
} from "@fixtures/sessionData"
import { GitHubService } from "@services/db/GitHubService"
import * as ReviewApi from "@services/db/review"
import { ConfigYmlService } from "@services/fileServices/YmlFileServices/ConfigYmlService"
import { getUsersService, notificationsService } from "@services/identity"
import CollaboratorsService from "@services/identity/CollaboratorsService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import SitesService from "@services/identity/SitesService"
import ReviewRequestService from "@services/review/ReviewRequestService"
import { sequelize } from "@tests/database"

const mockSiteId = "1"
const mockSiteMemberId = "1"

const mockGithubService = {
  getPullRequest: jest.fn(),
  getComments: jest.fn(),
}
const usersService = getUsersService(sequelize)
const reviewRequestService = new ReviewRequestService(
  (mockGithubService as unknown) as typeof ReviewApi,
  User,
  ReviewRequest,
  Reviewer,
  ReviewMeta,
  ReviewRequestView
)
const sitesService = new SitesService({
  siteRepository: Site,
  gitHubService: (mockGithubService as unknown) as GitHubService,
  configYmlService: (jest.fn() as unknown) as ConfigYmlService,
  usersService,
  isomerAdminsService: (jest.fn() as unknown) as IsomerAdminsService,
  reviewRequestService,
})
const collaboratorsService = new CollaboratorsService({
  siteRepository: Site,
  siteMemberRepository: SiteMember,
  sitesService,
  usersService,
  whitelist: Whitelist,
})

const notificationsHandler = new NotificationOnEditHandler({
  reviewRequestService,
  collaboratorsService,
  sitesService,
  notificationsService,
})

// Set up express with defaults and use the router under test
const subrouter = express()
const subSubrouter = express()
subSubrouter.get("/:siteName/test", async (req, res, next) =>
  // Dummy subrouter
  next()
)
subrouter.use(subSubrouter)

// We handle the test slightly diferently - jest interprets the end of the test as when the response is sent,
// but we normally create a notification after this response, due to the position of the middleware
// the solution to get tests working is to send a response only after the notification middleware
subrouter.use(async (req, res, next) => {
  await notificationsHandler.createNotification(req as any, res as any, next)
  res.status(200).send(200)
})
const userSessionData = new UserSessionData({
  isomerUserId: mockIsomerUserId,
  email: mockEmail,
})
const app = generateRouterForUserWithSite(
  subrouter,
  userSessionData,
  mockSiteName
)

describe("Notifications Router", () => {
  const mockAdditionalUserId = "2"
  const mockAdditionalSiteId = "2"
  const mockAdditionalSiteMemberId = "2"
  const mockAnotherSiteMemberId = "3"

  beforeAll(async () => {
    // Mock github service return
    mockGithubService.getPullRequest.mockResolvedValue({
      title: "title",
      body: "body",
      changed_files: [],
      created_at: new Date(),
    })

    // We need to force the relevant tables to start from a clean slate
    // Otherwise, some tests may fail due to the auto-incrementing IDs
    // not starting from 1
    await User.sync({ force: true })
    await Site.sync({ force: true })
    await Repo.sync({ force: true })
    await SiteMember.sync({ force: true })
    await Notification.sync({ force: true })
    await ReviewMeta.sync({ force: true })
    await ReviewRequest.sync({ force: true })

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
      name: "mockSite2",
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

  afterAll(async () => {
    await SiteMember.sync({ force: true })
    await Site.sync({ force: true })
    await User.sync({ force: true })
    await Repo.sync({ force: true })
  })

  describe("createNotification handler", () => {
    afterEach(async () => {
      // Clean up so that different tests using
      // the same notifications don't interfere with each other
      await Notification.sync({ force: true })
      await ReviewMeta.sync({ force: true })
      await ReviewRequest.sync({ force: true })
    })
    it("should create a new notification when called", async () => {
      // Arrange
      await ReviewRequest.create({
        id: 1,
        requestorId: mockIsomerUserId,
        siteId: mockSiteId,
        reviewStatus: "OPEN",
      })
      await ReviewMeta.create({
        reviewId: 1,
        pullRequestNumber: 1,
        reviewLink: "test",
      })
      mockGithubService.getComments.mockResolvedValueOnce([])

      // Act
      await request(app).get(`/${mockSiteName}/test`)

      // Assert
      // Notification should be sent to all site members other than the creator
      expect(
        (
          await Notification.findAll({
            where: {
              userId: mockAdditionalUserId,
              siteId: mockSiteId,
              siteMemberId: mockAdditionalSiteMemberId,
              firstReadTime: null,
            },
          })
        ).length
      ).toEqual(1)
      expect(
        (
          await Notification.findAll({
            where: {
              userId: mockIsomerUserId,
              siteId: mockSiteId,
              siteMemberId: mockSiteMemberId,
              firstReadTime: null,
            },
          })
        ).length
      ).toEqual(0)
    })
  })
})
