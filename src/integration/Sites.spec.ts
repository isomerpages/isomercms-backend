import express from "express"
import mockAxios from "jest-mock-axios"
import request from "supertest"

import { IsomerAdmin, Repo, Site, SiteMember, User } from "@database/models"
import { generateRouter } from "@fixtures/app"
import UserSessionData from "@root/classes/UserSessionData"
import { mockEmail, mockIsomerUserId } from "@root/fixtures/sessionData"
import { SitesRouter as _SitesRouter } from "@root/routes/v2/authenticated/sites"
import { GitHubService } from "@root/services/db/GitHubService"
import { ConfigYmlService } from "@root/services/fileServices/YmlFileServices/ConfigYmlService"
import IsomerAdminsService from "@root/services/identity/IsomerAdminsService"
import SitesService from "@root/services/identity/SitesService"
import TokenStore from "@root/services/identity/TokenStore"
import { getUsersService } from "@services/identity"
import { sequelize } from "@tests/database"

const mockSite = "mockSite"
const mockSiteId = "1"
const mockAdminSite = "adminOnly"
const mockUpdatedAt = "now"
const mockPermissions = { push: true }
const mockPrivate = true

const gitHubService = new GitHubService({ axiosInstance: mockAxios.create() })
const configYmlService = new ConfigYmlService({ gitHubService })
const usersService = getUsersService(sequelize)
const isomerAdminsService = new IsomerAdminsService({ repository: IsomerAdmin })
const tokenStore = new TokenStore()
const sitesService = new SitesService({
  siteRepository: Site,
  gitHubService,
  configYmlService,
  usersService,
  isomerAdminsService,
  tokenStore,
})

const SitesRouter = new _SitesRouter({ sitesService })
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
