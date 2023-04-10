import express from "express"
import StatsDClient from "hot-shots"
import mockAxios from "jest-mock-axios"
import request from "supertest"

import {
  AccessToken,
  IsomerAdmin,
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
import { mockEmail, mockIsomerUserId } from "@root/fixtures/sessionData"
import { getAuthorizationMiddleware } from "@root/middleware"
import { SitesRouter as _SitesRouter } from "@root/routes/v2/authenticated/sites"
import { isomerRepoAxiosInstance } from "@root/services/api/AxiosInstance"
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
import { ConfigYmlService } from "@root/services/fileServices/YmlFileServices/ConfigYmlService"
import { FooterYmlService } from "@root/services/fileServices/YmlFileServices/FooterYmlService"
import IsomerAdminsService from "@root/services/identity/IsomerAdminsService"
import SitesService from "@root/services/identity/SitesService"
import { StatsService } from "@root/services/infra/StatsService"
import ReviewRequestService from "@root/services/review/ReviewRequestService"
import { getIdentityAuthService, getUsersService } from "@services/identity"
import CollaboratorsService from "@services/identity/CollaboratorsService"
import { sequelize } from "@tests/database"

const mockSite = "mockSite"
const mockSiteId = "1"
const mockAdminSite = "adminOnly"
const mockUpdatedAt = "now"
const mockPermissions = { push: true }
const mockPrivate = true

const gitHubService = new GitHubService({
  axiosInstance: isomerRepoAxiosInstance,
})
const configYmlService = new ConfigYmlService({ gitHubService })
const usersService = getUsersService(sequelize)
const isomerAdminsService = new IsomerAdminsService({ repository: IsomerAdmin })
const identityAuthService = getIdentityAuthService(gitHubService)
const unlinkedPageService = new UnlinkedPageService({ gitHubService })
const collectionYmlService = new CollectionYmlService({ gitHubService })
const homepageService = new HomepagePageService({ gitHubService })
const footerYmlService = new FooterYmlService({ gitHubService })
const collectionPageService = new CollectionPageService({
  gitHubService,
  collectionYmlService,
})
const subCollectionPageService = new SubcollectionPageService({
  gitHubService,
  collectionYmlService,
})
const contactUsService = new ContactUsPageService({
  gitHubService,
  footerYmlService,
})
const baseDirectoryService = new BaseDirectoryService({ gitHubService })
const resourcePageService = new ResourcePageService({ gitHubService })
const resourceRoomDirectoryService = new ResourceRoomDirectoryService({
  baseDirectoryService,
  configYmlService,
  gitHubService,
})
const pageService = new PageService({
  contactUsService,
  collectionPageService,
  subCollectionPageService,
  homepageService,
  resourcePageService,
  unlinkedPageService,
  resourceRoomDirectoryService,
})
const reviewRequestService = new ReviewRequestService(
  gitHubService,
  User,
  ReviewRequest,
  Reviewer,
  ReviewMeta,
  ReviewRequestView,
  pageService
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

const statsService = new StatsService(
  new StatsDClient(),
  User,
  AccessToken,
  Site
)

const SitesRouter = new _SitesRouter({
  sitesService,
  authorizationMiddleware,
  statsService,
})
const sitesSubrouter = SitesRouter.getRouter()

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
subrouter.use(sitesSubrouter)
const app = generateRouter(subrouter)

const mockGenericAxios = mockAxios.create()
mockGenericAxios.get.mockResolvedValue({
  data: [],
})

describe("Sites Router", () => {
  beforeAll(() => {
    // NOTE: Because SitesService uses an axios instance,
    // we need to mock the axios instance using es5 named exports
    // to ensure that the calls for .get() on the instance
    // will actually return a value and not fail.
    jest.mock("../services/api/AxiosInstance.ts", () => ({
      __esModule: true, // this property makes it work
      genericGitHubAxiosInstance: mockGenericAxios,
    }))
  })

  describe("/", () => {
    beforeAll(async () => {
      // We need to force the relevant tables to start from a clean slate
      // Otherwise, some tests may fail due to the auto-incrementing IDs
      // not starting from 1
      await User.sync({ force: true })
      await Site.sync({ force: true })
      await Repo.sync({ force: true })
      await SiteMember.sync({ force: true })
      // Set up User and Site table entries
      await User.create({
        id: mockIsomerUserId,
      })
      await Site.create({
        id: mockSiteId,
        name: mockSite,
        apiTokenName: "token",
        jobStatus: "READY",
        siteStatus: "LAUNCHED",
        creatorId: mockIsomerUserId,
      })
      await Site.create({
        id: "200",
        name: mockAdminSite,
        apiTokenName: "token",
        jobStatus: "READY",
        siteStatus: "LAUNCHED",
        creatorId: mockIsomerUserId,
      })
      await SiteMember.create({
        userId: mockIsomerUserId,
        siteId: mockSiteId,
        role: "ADMIN",
      })
      await Repo.create({
        name: mockSite,
        url: "url",
        siteId: mockSiteId,
      })
    })
    afterEach(async () => {
      // Clean up so that different tests using
      // the same mock user don't interfere with each other
      await IsomerAdmin.destroy({
        where: { userId: mockIsomerUserId },
      })
    })

    afterAll(async () => {
      await IsomerAdmin.sync({ force: true })
      await SiteMember.sync({ force: true })
      await Site.sync({ force: true })
      await User.sync({ force: true })
      await Repo.sync({ force: true })
    })

    it("should return list of only sites available to email user", async () => {
      // Arrange
      const expected = {
        siteNames: [
          {
            lastUpdated: mockUpdatedAt,
            repoName: mockSite,
            isPrivate: mockPrivate,
            permissions: mockPermissions,
          },
        ],
      }

      mockGenericAxios.get.mockResolvedValueOnce({
        data: [
          {
            pushed_at: mockUpdatedAt,
            permissions: mockPermissions,
            name: mockSite,
            private: mockPrivate,
          },
          {
            pushed_at: mockUpdatedAt,
            permissions: mockPermissions,
            name: mockAdminSite,
            private: mockPrivate,
          },
        ],
      })

      // Act
      const actual = await request(app).get("/")

      // Assert
      expect(actual.body).toMatchObject(expected)
    })
    it("should return list of all sites available for admin", async () => {
      // Arrange
      await IsomerAdmin.create({
        userId: mockIsomerUserId,
      })
      const expected = {
        siteNames: [
          {
            lastUpdated: mockUpdatedAt,
            repoName: mockSite,
            isPrivate: mockPrivate,
            permissions: mockPermissions,
          },
          {
            lastUpdated: mockUpdatedAt,
            repoName: mockAdminSite,
            isPrivate: mockPrivate,
            permissions: mockPermissions,
          },
        ],
      }
      mockGenericAxios.get.mockResolvedValueOnce({
        data: [
          {
            pushed_at: mockUpdatedAt,
            permissions: mockPermissions,
            name: mockSite,
            private: mockPrivate,
          },
          {
            pushed_at: mockUpdatedAt,
            permissions: mockPermissions,
            name: mockAdminSite,
            private: mockPrivate,
          },
        ],
      })

      // Act
      const actual = await request(app).get("/")

      // Assert
      expect(actual.body).toMatchObject(expected)
    })
  })
})
