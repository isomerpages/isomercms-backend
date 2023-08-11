import express from "express"
import mockAxios from "jest-mock-axios"
import { ok, okAsync } from "neverthrow"
import simpleGit from "simple-git"
import request from "supertest"

import { SitesRouter as _SitesRouter } from "@routes/v2/authenticated/sites"

import {
  Deployment,
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
import { generateRouterForUserWithSite } from "@fixtures/app"
import {
  MOCK_USER_SESSION_DATA_ONE,
  MOCK_USER_SESSION_DATA_TWO,
} from "@fixtures/sessionData"
import {
  MOCK_SITEMEMBER_DBENTRY_ONE as MOCK_SITEMEMBER_DBENTRY_WITHOUT_PASSWORD,
  MOCK_SITEMEMBER_DBENTRY_TWO as MOCK_SITEMEMBER_DBENTRY_WITH_PASSWORD,
  MOCK_REPO_NAME_ONE as MOCK_AMPLIFY_REPO_WITHOUT_PASSWORD,
  MOCK_REPO_NAME_TWO as MOCK_AMPLIFY_REPO_WITH_PASSWORD,
  MOCK_DEPLOYMENT_DBENTRY_ONE as MOCK_DEPLOYMENT_DBENTRY_WITHOUT_PASSWORD,
  MOCK_DEPLOYMENT_DBENTRY_TWO as MOCK_DEPLOYMENT_DBENTRY_WITH_PASSWORD,
  MOCK_REPO_DBENTRY_ONE as MOCK_REPO_DBENTRY_WITHOUT_PASSWORD,
  MOCK_REPO_DBENTRY_TWO as MOCK_REPO_DBENTRY_WITH_PASSWORD,
  MOCK_SITE_DBENTRY_ONE as MOCK_SITE_DBENTRY_WITHOUT_PASSWORD,
  MOCK_SITE_DBENTRY_TWO as MOCK_SITE_DBENTRY_WITH_PASSWORD,
} from "@fixtures/sites"
import {
  MOCK_USER_DBENTRY_ONE,
  MOCK_USER_DBENTRY_THREE,
  MOCK_USER_DBENTRY_TWO,
} from "@fixtures/users"
import { AuthorizationMiddleware } from "@root/middleware/authorization"
import { SettingsRouter as _SettingsRouter } from "@root/routes/v2/authenticatedSites/settings"
import { SettingsService } from "@root/services/configServices/SettingsService"
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
import { FooterYmlService } from "@root/services/fileServices/YmlFileServices/FooterYmlService"
import { NavYmlService } from "@root/services/fileServices/YmlFileServices/NavYmlService"
import CollaboratorsService from "@root/services/identity/CollaboratorsService"
import DeploymentsService from "@root/services/identity/DeploymentsService"
import PreviewService from "@root/services/identity/PreviewService"
import { SitesCacheService } from "@root/services/identity/SitesCacheService"
import AuthorizationMiddlewareService from "@root/services/middlewareServices/AuthorizationMiddlewareService"
import { isomerRepoAxiosInstance } from "@services/api/AxiosInstance"
import GitFileSystemService from "@services/db/GitFileSystemService"
import RepoService from "@services/db/RepoService"
import { ConfigYmlService } from "@services/fileServices/YmlFileServices/ConfigYmlService"
import { getIdentityAuthService, getUsersService } from "@services/identity"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import SitesService from "@services/identity/SitesService"
import ReviewRequestService from "@services/review/ReviewRequestService"
import { sequelize } from "@tests/database"

const mockUpdateInput = "updateInput"
const mockDeleteInput = "deleteInput"
const MOCK_PASSWORD = "password"

jest.mock("../utils/crypto-utils", () => ({
  __esModule: true,
  decryptPassword: jest.fn().mockReturnValue("password"),
  encryptPassword: jest.fn().mockReturnValue({
    encryptedPassword: "enc_password",
    iv: "new_iv",
  }),
}))
jest.mock("../services/identity/DeploymentClient", () =>
  jest.fn().mockImplementation(() => ({
    __esModule: true,
    generateUpdatePasswordInput: jest
      .fn()
      .mockImplementation(() => ok(mockUpdateInput)),
    sendUpdateApp: jest.fn().mockImplementation(() => okAsync("")),
    generateDeletePasswordInput: jest
      .fn()
      .mockImplementation(() => ok(mockDeleteInput)),
  }))
)
const gitFileSystemService = new GitFileSystemService(simpleGit())
const gitHubService = new RepoService(
  isomerRepoAxiosInstance,
  gitFileSystemService
)
const configYmlService = new ConfigYmlService({ gitHubService })
const usersService = getUsersService(sequelize)
const isomerAdminsService = new IsomerAdminsService({ repository: IsomerAdmin })
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
  (gitHubService as unknown) as RepoService,
  User,
  ReviewRequest,
  Reviewer,
  ReviewMeta,
  ReviewRequestView,
  pageService,
  configService,
  sequelize
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
const navYmlService = new NavYmlService({
  gitHubService,
})
const homepagePageService = new HomepagePageService({
  gitHubService,
})
const deploymentsService = new DeploymentsService({
  deploymentsRepository: Deployment,
})

const identityAuthService = getIdentityAuthService(gitHubService)
const collaboratorsService = new CollaboratorsService({
  siteRepository: Site,
  siteMemberRepository: SiteMember,
  sitesService,
  usersService,
  whitelist: Whitelist,
})
const authorizationMiddlewareService = new AuthorizationMiddlewareService({
  identityAuthService,
  usersService,
  isomerAdminsService,
  collaboratorsService,
})
const authorizationMiddleware = new AuthorizationMiddleware({
  authorizationMiddlewareService,
})

const settingsService = new SettingsService({
  configYmlService,
  footerYmlService,
  navYmlService,
  homepagePageService,
  sitesService,
  deploymentsService,
  gitHubService,
})
const SettingsRouter = new _SettingsRouter({
  settingsService,
  authorizationMiddleware,
})
const settingsSubrouter = SettingsRouter.getRouter()
const subrouter = express()
subrouter.use("/:siteName", settingsSubrouter)

const mockGenericAxios = mockAxios.create()
mockGenericAxios.patch.mockResolvedValue({
  data: [],
})

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"

describe("Password integration tests", () => {
  beforeAll(async () => {
    // NOTE: Because SitesService uses an axios instance,
    // we need to mock the axios instance using es5 named exports
    // to ensure that the calls for .get() on the instance
    // will actually return a value and not fail.
    jest.mock("../services/api/AxiosInstance.ts", () => ({
      __esModule: true, // this property makes it work
      genericGitHubAxiosInstance: mockGenericAxios,
    }))

    // We need to force the relevant tables to start from a clean slate
    // Otherwise, some tests may fail due to the auto-incrementing IDs
    // not starting from 1
    await User.sync({ force: true })
    await Site.sync({ force: true })
    await Repo.sync({ force: true })
    await SiteMember.sync({ force: true })
    await Deployment.sync({ force: true })

    await User.create(MOCK_USER_DBENTRY_ONE)
    await User.create(MOCK_USER_DBENTRY_TWO)
    await User.create(MOCK_USER_DBENTRY_THREE)
    await Site.create(MOCK_SITE_DBENTRY_WITHOUT_PASSWORD)
    await Site.create(MOCK_SITE_DBENTRY_WITH_PASSWORD)
    await Deployment.create(MOCK_DEPLOYMENT_DBENTRY_WITHOUT_PASSWORD)
    await Deployment.create(MOCK_DEPLOYMENT_DBENTRY_WITH_PASSWORD)
    await Repo.create(MOCK_REPO_DBENTRY_WITHOUT_PASSWORD)
    await Repo.create(MOCK_REPO_DBENTRY_WITH_PASSWORD)
    await SiteMember.create(MOCK_SITEMEMBER_DBENTRY_WITHOUT_PASSWORD)
    await SiteMember.create(MOCK_SITEMEMBER_DBENTRY_WITH_PASSWORD)
  })

  afterAll(async () => {
    await User.sync({ force: true })
    await Site.sync({ force: true })
    await Repo.sync({ force: true })
    await SiteMember.sync({ force: true })
    await Deployment.sync({ force: true })
  })

  describe("GET /repo-password", () => {
    it("should successfully retrieve password for an amplify site with a password", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_AMPLIFY_REPO_WITH_PASSWORD
      )

      const expected = {
        password: MOCK_PASSWORD,
        isAmplifySite: true,
      }

      // Act
      const actual = await request(app).get(
        `/${MOCK_AMPLIFY_REPO_WITH_PASSWORD}/repo-password`
      )

      // Assert
      expect(actual.statusCode).toEqual(200)
      expect(actual.body).toMatchObject(expected)
    })

    it("should successfully return empty string for an amplify site with no password", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_AMPLIFY_REPO_WITHOUT_PASSWORD
      )

      const expected = {
        password: "",
        isAmplifySite: true,
      }

      // Act
      const actual = await request(app).get(
        `/${MOCK_AMPLIFY_REPO_WITHOUT_PASSWORD}/repo-password`
      )

      // Assert
      expect(actual.statusCode).toEqual(200)
      expect(actual.body).toMatchObject(expected)
    })

    it("should return empty string for netlify sites", async () => {
      // Arrange
      const MOCK_NETLIFY_REPO_NAME = "netlify"
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_NETLIFY_REPO_NAME
      )

      const expected = {
        isAmplifySite: false,
      }

      // Act
      const actual = await request(app).get(
        `/${MOCK_NETLIFY_REPO_NAME}/repo-password`
      )

      // Assert
      expect(actual.statusCode).toEqual(200)
      expect(actual.body).toMatchObject(expected)
    })
  })

  describe("POST /repo-password", () => {
    afterEach(() => {
      jest.clearAllMocks()
    })

    it("should successfully update a password for already private amplify sites", async () => {
      // Arrange
      const newPassword = "blahblahblahblahblahblahblahblahblahblahQ1!"
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_AMPLIFY_REPO_WITH_PASSWORD
      )
      const mockPrivatisationRequest = {
        password: newPassword,
        enablePassword: true,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_AMPLIFY_REPO_WITH_PASSWORD}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(200)
      const actualDeployment = await Deployment.findOne({
        where: {
          id: MOCK_DEPLOYMENT_DBENTRY_WITH_PASSWORD.id,
        },
      })
      if (!actualDeployment) fail()
      const { encryptionIv, encryptedPassword } = actualDeployment
      expect(encryptionIv).not.toEqual(
        MOCK_DEPLOYMENT_DBENTRY_WITH_PASSWORD.encryptionIv
      )
      expect(encryptionIv).not.toEqual(null)
      expect(encryptedPassword).not.toEqual(
        MOCK_DEPLOYMENT_DBENTRY_WITH_PASSWORD.encryptedPassword
      )
      expect(encryptedPassword).not.toEqual(null)
      expect(mockGenericAxios.patch).not.toHaveBeenCalled()
    })

    it("should successfully remove a password for private amplify sites", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_AMPLIFY_REPO_WITH_PASSWORD
      )
      const mockPrivatisationRequest = {
        enablePassword: false,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_AMPLIFY_REPO_WITH_PASSWORD}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(200)
      const actualDeployment = await Deployment.findOne({
        where: {
          id: MOCK_DEPLOYMENT_DBENTRY_WITH_PASSWORD.id,
        },
      })
      if (!actualDeployment) fail()
      const { encryptionIv, encryptedPassword } = actualDeployment
      expect(encryptionIv).toEqual(null)
      expect(encryptedPassword).toEqual(null)
      expect(mockGenericAxios.patch).toHaveBeenCalled()
    })

    it("should do nothing when removing a password for already public amplify sites", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_AMPLIFY_REPO_WITHOUT_PASSWORD
      )
      const mockPrivatisationRequest = {
        enablePassword: false,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_AMPLIFY_REPO_WITHOUT_PASSWORD}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(200)
      const actualDeployment = await Deployment.findOne({
        where: {
          id: MOCK_DEPLOYMENT_DBENTRY_WITHOUT_PASSWORD.id,
        },
      })
      if (!actualDeployment) fail()
      const { encryptionIv, encryptedPassword } = actualDeployment
      expect(encryptionIv).toEqual(null)
      expect(encryptedPassword).toEqual(null)
      expect(mockGenericAxios.patch).not.toHaveBeenCalled()
    })

    it("should successfully set a password for public amplify sites", async () => {
      // Arrange
      const newPassword = "Blahblahblahblahblahblahblahblah1!"
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_AMPLIFY_REPO_WITHOUT_PASSWORD
      )
      const mockPrivatisationRequest = {
        password: newPassword,
        enablePassword: true,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_AMPLIFY_REPO_WITHOUT_PASSWORD}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(200)
      const actualDeployment = await Deployment.findOne({
        where: {
          id: MOCK_DEPLOYMENT_DBENTRY_WITHOUT_PASSWORD.id,
        },
      })
      if (!actualDeployment) fail()
      const { encryptionIv, encryptedPassword } = actualDeployment
      expect(encryptionIv).not.toEqual(null)
      expect(encryptedPassword).not.toEqual(null)
      expect(mockGenericAxios.patch).toHaveBeenCalled()
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const FAKE_REPO_NAME = "fake"
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        FAKE_REPO_NAME
      )
      const mockPrivatisationRequest = {
        enablePassword: false,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_AMPLIFY_REPO_WITH_PASSWORD}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 400 if request is invalid", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_AMPLIFY_REPO_WITHOUT_PASSWORD
      )
      const mockPrivatisationRequest = {
        password: "",
        fakeParam: "",
        enablePassword: false,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_AMPLIFY_REPO_WITHOUT_PASSWORD}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(400)
    })

    it("should return 400 if password does not fulfill regex", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_AMPLIFY_REPO_WITHOUT_PASSWORD
      )
      const mockPrivatisationRequest = {
        password: "blah",
        enablePassword: false,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_AMPLIFY_REPO_WITHOUT_PASSWORD}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(400)
    })

    it("should return 400 if password is provided even though enablePassword is false", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_AMPLIFY_REPO_WITHOUT_PASSWORD
      )
      const mockPrivatisationRequest = {
        password: "blahblahblahblahblahblahblahblahQ1!",
        enablePassword: false,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_AMPLIFY_REPO_WITHOUT_PASSWORD}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(400)
    })
  })
})
