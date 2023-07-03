import express from "express"
import mockAxios from "jest-mock-axios"
import { ok, okAsync } from "neverthrow"
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
} from "@database/models"
import { generateRouterForUserWithSite } from "@fixtures/app"
import {
  MOCK_GITHUB_COMMENT_BODY_ONE,
  MOCK_GITHUB_COMMENT_BODY_TWO,
  MOCK_GITHUB_COMMIT_ALPHA_ONE,
  MOCK_GITHUB_COMMIT_ALPHA_THREE,
  MOCK_GITHUB_COMMIT_ALPHA_TWO,
  MOCK_GITHUB_COMMIT_DATE_ONE,
  MOCK_GITHUB_COMMIT_DATE_THREE,
  MOCK_GITHUB_FILENAME_ALPHA_ONE,
  MOCK_GITHUB_FILENAME_ALPHA_TWO,
  MOCK_GITHUB_FILEPATH_ALPHA_TWO,
  MOCK_GITHUB_FILE_CHANGE_INFO_ALPHA_ONE,
  MOCK_GITHUB_FILE_CHANGE_INFO_ALPHA_TWO,
  MOCK_GITHUB_PULL_REQUEST_NUMBER,
  MOCK_GITHUB_RAWCOMMENT_ONE,
  MOCK_GITHUB_RAWCOMMENT_TWO,
  MOCK_GITHUB_FRONTMATTER,
  MOCK_PAGE_PERMALINK,
} from "@fixtures/github"
import { MOCK_GITHUB_DATE_ONE } from "@fixtures/identity"
import {
  MOCK_PULL_REQUEST_BODY_ONE,
  MOCK_PULL_REQUEST_CHANGED_FILES_ONE,
  MOCK_PULL_REQUEST_ONE,
  MOCK_PULL_REQUEST_TITLE_ONE,
} from "@fixtures/review"
import {
  MOCK_USER_SESSION_DATA_ONE,
  MOCK_USER_SESSION_DATA_THREE,
  MOCK_USER_SESSION_DATA_TWO,
} from "@fixtures/sessionData"
import {
  MOCK_REPO_DBENTRY_ONE,
  MOCK_SITEMEMBER_DBENTRY_ONE,
  MOCK_SITEMEMBER_DBENTRY_TWO,
  MOCK_SITE_DBENTRY_ONE,
  MOCK_SITE_ID_ONE,
  MOCK_REPO_NAME_ONE,
  MOCK_REPO_NAME_TWO,
  MOCK_SITE_ID_TWO,
  MOCK_DEPLOYMENT_DBENTRY_ONE,
  MOCK_DEPLOYMENT_DBENTRY_TWO,
  MOCK_REPO_DBENTRY_TWO,
  MOCK_SITE_DBENTRY_TWO,
} from "@fixtures/sites"
import {
  MOCK_USER_DBENTRY_ONE,
  MOCK_USER_DBENTRY_THREE,
  MOCK_USER_DBENTRY_TWO,
  MOCK_USER_EMAIL_ONE,
  MOCK_USER_EMAIL_THREE,
  MOCK_USER_EMAIL_TWO,
  MOCK_USER_ID_ONE,
  MOCK_USER_ID_TWO,
} from "@fixtures/users"
import UserSessionData from "@root/classes/UserSessionData"
import { ReviewRequestStatus } from "@root/constants"
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
import DeploymentsService from "@root/services/identity/DeploymentsService"
import { ReviewRequestDto } from "@root/types/dto/review"
import { GitHubService } from "@services/db/GitHubService"
import * as ReviewApi from "@services/db/review"
import { ConfigYmlService } from "@services/fileServices/YmlFileServices/ConfigYmlService"
import { getUsersService } from "@services/identity"
import DeploymentClient from "@services/identity/DeploymentClient"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import SitesService from "@services/identity/SitesService"
import ReviewRequestService from "@services/review/ReviewRequestService"
import { sequelize } from "@tests/database"

const mockUpdateInput = "updateInput"
const mockDeleteInput = "deleteInput"
const MOCK_PASSWORD = "password"
const MOCK_ENCRYPTED_PASSWORD = "enc_password"
const MOCK_IV = "new_iv"

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

const gitHubService = new GitHubService({ axiosInstance: mockAxios.create() })
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
  (gitHubService as unknown) as typeof ReviewApi,
  User,
  ReviewRequest,
  Reviewer,
  ReviewMeta,
  ReviewRequestView,
  pageService,
  configService
)
const sitesService = new SitesService({
  siteRepository: Site,
  gitHubService,
  configYmlService,
  usersService,
  isomerAdminsService,
  reviewRequestService,
})
const navYmlService = new NavYmlService({
  gitHubService,
})
const homepagePageService = new HomepagePageService({
  gitHubService,
})
const deploymentsService = new DeploymentsService({
  repository: Deployment,
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
const SettingsRouter = new _SettingsRouter({ settingsService })
const settingsSubrouter = SettingsRouter.getRouter()
const subrouter = express()
subrouter.use("/:siteName", settingsSubrouter)

const mockGenericAxios = mockAxios.create()
mockGenericAxios.patch.mockResolvedValue({
  data: [],
})
// const migrateSpy = jest
//   .spyOn(ReviewsRouter, "checkIfSiteIsUnmigrated")
//   .mockResolvedValue(true)

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
    await Site.create(MOCK_SITE_DBENTRY_ONE)
    await Site.create(MOCK_SITE_DBENTRY_TWO)
    await Deployment.create(MOCK_DEPLOYMENT_DBENTRY_ONE)
    await Deployment.create(MOCK_DEPLOYMENT_DBENTRY_TWO)
    await Repo.create(MOCK_REPO_DBENTRY_ONE)
    await Repo.create(MOCK_REPO_DBENTRY_TWO)
    await SiteMember.create(MOCK_SITEMEMBER_DBENTRY_ONE)
    await SiteMember.create(MOCK_SITEMEMBER_DBENTRY_TWO)
  })

  afterAll(async () => {
    await User.sync({ force: true })
    await Site.sync({ force: true })
    await Repo.sync({ force: true })
    await SiteMember.sync({ force: true })
    await Deployment.sync({ force: true })
  })

  describe("GET /repo-password", () => {
    it("should successfully retrieve password for an amplify site", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_TWO
      )

      const expected = {
        password: MOCK_PASSWORD,
        isAmplifySite: true,
      }

      // Act
      const actual = await request(app).get(
        `/${MOCK_REPO_NAME_TWO}/repo-password`
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
        MOCK_REPO_NAME_ONE
      )

      const expected = {
        password: "",
        isAmplifySite: true,
      }

      // Act
      const actual = await request(app).get(
        `/${MOCK_REPO_NAME_ONE}/repo-password`
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
        password: "",
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
      const newPassword = "blah"
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_TWO
      )
      const mockPrivatisationRequest = {
        password: newPassword,
        enablePassword: true,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_REPO_NAME_TWO}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(200)
      const actualDeployment = await Deployment.findOne({
        where: {
          id: MOCK_DEPLOYMENT_DBENTRY_TWO.id,
        },
      })
      if (!actualDeployment) fail()
      const { encryptionIv, encryptedPassword } = actualDeployment
      expect(encryptionIv).not.toEqual(MOCK_DEPLOYMENT_DBENTRY_TWO.encryptionIv)
      expect(encryptionIv).not.toEqual(null)
      expect(encryptedPassword).not.toEqual(
        MOCK_DEPLOYMENT_DBENTRY_TWO.encryptedPassword
      )
      expect(encryptedPassword).not.toEqual(null)
      expect(mockGenericAxios.patch).not.toHaveBeenCalled()
    })

    it("should successfully remove a password for private amplify sites", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_TWO
      )
      const mockPrivatisationRequest = {
        password: "",
        enablePassword: false,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_REPO_NAME_TWO}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(200)
      const actualDeployment = await Deployment.findOne({
        where: {
          id: MOCK_DEPLOYMENT_DBENTRY_TWO.id,
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
        MOCK_REPO_NAME_ONE
      )
      const mockPrivatisationRequest = {
        password: "",
        enablePassword: false,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_REPO_NAME_ONE}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(200)
      const actualDeployment = await Deployment.findOne({
        where: {
          id: MOCK_DEPLOYMENT_DBENTRY_ONE.id,
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
      const newPassword = "blah"
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )
      const mockPrivatisationRequest = {
        password: newPassword,
        enablePassword: true,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_REPO_NAME_ONE}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(200)
      const actualDeployment = await Deployment.findOne({
        where: {
          id: MOCK_DEPLOYMENT_DBENTRY_ONE.id,
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
        password: "",
        enablePassword: false,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_REPO_NAME_TWO}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 400 if request is invalid", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )
      const mockPrivatisationRequest = {
        password: "",
        fakeParam: "",
        enablePassword: false,
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_REPO_NAME_ONE}/repo-password`)
        .send(mockPrivatisationRequest)

      // Assert
      expect(actual.statusCode).toEqual(400)
    })
  })
})