import express from "express"
import mockAxios from "jest-mock-axios"
import request from "supertest"

import { ReviewsRouter as _ReviewsRouter } from "@routes/v2/authenticated/review"
import { SitesRouter as _SitesRouter } from "@routes/v2/authenticated/sites"

import {
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
} from "@fixtures/sites"
import {
  MOCK_USER_DBENTRY_ONE,
  MOCK_USER_DBENTRY_THREE,
  MOCK_USER_DBENTRY_TWO,
  MOCK_USER_EMAIL_ONE,
  MOCK_USER_EMAIL_TWO,
  MOCK_USER_ID_ONE,
  MOCK_USER_ID_TWO,
} from "@fixtures/users"
import { ReviewRequestStatus } from "@root/constants"
import {
  MOCK_GITHUB_COMMIT_ALPHA_ONE,
  MOCK_GITHUB_COMMIT_ALPHA_THREE,
  MOCK_GITHUB_COMMIT_ALPHA_TWO,
  MOCK_GITHUB_COMMIT_DATE_THREE,
  MOCK_GITHUB_FILENAME_ALPHA_ONE,
  MOCK_GITHUB_FILENAME_ALPHA_TWO,
  MOCK_GITHUB_FILEPATH_ALPHA_TWO,
  MOCK_GITHUB_FILE_CHANGE_INFO_ALPHA_ONE,
  MOCK_GITHUB_FILE_CHANGE_INFO_ALPHA_TWO,
  MOCK_GITHUB_PULL_REQUEST_NUMBER,
  MOCK_GITHUB_RAWCOMMENT_ONE,
  MOCK_GITHUB_RAWCOMMENT_TWO,
} from "@root/fixtures/github"
import { MOCK_GITHUB_DATE_ONE } from "@root/fixtures/identity"
import {
  MOCK_PULL_REQUEST_BODY_ONE,
  MOCK_PULL_REQUEST_CHANGED_FILES_ONE,
  MOCK_PULL_REQUEST_ONE,
  MOCK_PULL_REQUEST_TITLE_ONE,
} from "@root/fixtures/review"
import { GitHubService } from "@services/db/GitHubService"
import { ConfigYmlService } from "@services/fileServices/YmlFileServices/ConfigYmlService"
import { getUsersService } from "@services/identity"
import CollaboratorsService from "@services/identity/CollaboratorsService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import SitesService from "@services/identity/SitesService"
import ReviewRequestService from "@services/review/ReviewRequestService"
import { sequelize } from "@tests/database"

const gitHubService = new GitHubService({ axiosInstance: mockAxios.create() })
const configYmlService = new ConfigYmlService({ gitHubService })
const usersService = getUsersService(sequelize)
const isomerAdminsService = new IsomerAdminsService({ repository: IsomerAdmin })
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

const ReviewsRouter = new _ReviewsRouter(
  reviewRequestService,
  usersService,
  sitesService,
  collaboratorsService
)
const reviewsSubrouter = ReviewsRouter.getRouter()
const subrouter = express()
subrouter.use("/:siteName", reviewsSubrouter)

const mockGenericAxios = mockAxios.create()

describe("Review Requests Router", () => {
  beforeAll(async () => {
    // NOTE: Because SitesService uses an axios instance,
    // we need to mock the axios instance using es5 named exports
    // to ensure that the calls for .get() on the instance
    // will actually return a value and not fail.
    jest.mock("../services/api/AxiosInstance.ts", () => ({
      __esModule: true, // this property makes it work
      genericGitHubAxiosInstance: mockGenericAxios,
    }))
    await User.sync({ force: true })
    await Site.sync({ force: true })
    await Repo.sync({ force: true })
    await SiteMember.sync({ force: true })

    await User.create(MOCK_USER_DBENTRY_ONE)
    await User.create(MOCK_USER_DBENTRY_TWO)
    await User.create(MOCK_USER_DBENTRY_THREE)
    await Site.create(MOCK_SITE_DBENTRY_ONE)
    await Repo.create(MOCK_REPO_DBENTRY_ONE)
    await SiteMember.create(MOCK_SITEMEMBER_DBENTRY_ONE)
    await SiteMember.create(MOCK_SITEMEMBER_DBENTRY_TWO)
  })

  afterAll(async () => {
    await SiteMember.destroy({
      where: {
        siteId: MOCK_SITE_ID_ONE,
      },
    })
    await User.destroy({
      where: {
        id: MOCK_USER_ID_ONE,
      },
    })
    await User.destroy({
      where: {
        id: MOCK_USER_ID_TWO,
      },
    })
    await Repo.destroy({
      where: {
        siteId: MOCK_SITE_ID_ONE,
      },
    })
    await Site.destroy({
      where: {
        id: MOCK_SITE_ID_ONE,
      },
    })
  })

  describe("/compare", () => {
    it("should get GitHub diff response for a valid site member", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )
      mockGenericAxios.get.mockResolvedValueOnce({
        data: {
          files: [
            MOCK_GITHUB_FILE_CHANGE_INFO_ALPHA_ONE,
            MOCK_GITHUB_FILE_CHANGE_INFO_ALPHA_TWO,
          ],
          commits: [
            MOCK_GITHUB_COMMIT_ALPHA_ONE,
            MOCK_GITHUB_COMMIT_ALPHA_TWO,
            MOCK_GITHUB_COMMIT_ALPHA_THREE,
          ],
        },
      })
      const expected = {
        items: [
          {
            type: ["page"],
            name: MOCK_GITHUB_FILENAME_ALPHA_ONE,
            path: [],
            url: "www.google.com",
            lastEditedBy: MOCK_USER_EMAIL_TWO, // TODO: This should be MOCK_USER_EMAIL_ONE
            lastEditedTime: new Date(MOCK_GITHUB_COMMIT_DATE_THREE).getTime(),
          },
          {
            type: ["page"],
            name: MOCK_GITHUB_FILENAME_ALPHA_TWO,
            path: MOCK_GITHUB_FILEPATH_ALPHA_TWO.split("/").filter((x) => x),
            url: "www.google.com",
            lastEditedBy: MOCK_USER_EMAIL_TWO,
            lastEditedTime: new Date(MOCK_GITHUB_COMMIT_DATE_THREE).getTime(),
          },
        ],
      }

      // Act
      const actual = await request(app).get(`/${MOCK_REPO_NAME_ONE}/compare`)

      // Assert
      expect(actual.statusCode).toEqual(200)
      expect(actual.body).toMatchObject(expected)
    })

    it("should return 404 if user is not a valid site member", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_THREE,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).get(`/${MOCK_REPO_NAME_ONE}/compare`)

      // Assert
      expect(actual.statusCode).toEqual(404)
    })
  })

  describe("/request", () => {
    afterAll(async () => {
      await ReviewMeta.destroy({
        where: {},
      })
      await Reviewer.destroy({
        where: {},
      })
      await ReviewRequest.destroy({
        where: {},
      })
    })

    it("should successfully create a review request when valid inputs are provided", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )
      const mockPullRequest = {
        reviewers: [MOCK_USER_EMAIL_ONE],
        title: "Fake title",
        description: "Fake description",
      }
      const expected = {
        pullRequestNumber: MOCK_GITHUB_PULL_REQUEST_NUMBER,
      }
      mockGenericAxios.post.mockResolvedValueOnce({
        data: {
          number: MOCK_GITHUB_PULL_REQUEST_NUMBER,
        },
      })

      // Act
      const actual = await request(app)
        .post(`/${MOCK_REPO_NAME_ONE}/request`)
        .send(mockPullRequest)

      // Assert
      expect(actual.body).toMatchObject(expected)
      expect(actual.statusCode).toEqual(200)
      const actualReviewRequest = await ReviewRequest.findOne({
        where: {
          requestorId: MOCK_USER_ID_TWO,
          siteId: MOCK_SITE_ID_ONE,
        },
      })
      const actualReviewer = await Reviewer.findOne({
        where: {
          requestId: actualReviewRequest?.id,
          reviewerId: MOCK_USER_ID_ONE,
        },
      })
      const actualReviewMeta = await ReviewMeta.findOne({
        where: {
          reviewId: actualReviewRequest?.id,
        },
      })
      expect(actualReviewRequest).not.toBeNull()
      expect(actualReviewer).not.toBeNull()
      expect(actualReviewMeta).not.toBeNull()
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_TWO
      )
      const mockPullRequest = {
        reviewers: [MOCK_USER_EMAIL_TWO],
        title: "Fake title",
        description: "Fake description",
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_REPO_NAME_TWO}/request`)
        .send(mockPullRequest)

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if user is not a valid site member", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_THREE,
        MOCK_REPO_NAME_ONE
      )
      const mockPullRequest = {
        reviewers: [MOCK_USER_EMAIL_TWO],
        title: "Fake title",
        description: "Fake description",
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_REPO_NAME_ONE}/request`)
        .send(mockPullRequest)

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 400 if no reviewers are provided", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )
      const mockPullRequest = {
        reviewers: [],
        title: "Fake title",
        description: "Fake description",
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_REPO_NAME_ONE}/request`)
        .send(mockPullRequest)

      // Assert
      expect(actual.statusCode).toEqual(400)
    })

    it("should return 400 if selected reviewers are not admins", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )
      const mockPullRequest = {
        reviewers: [MOCK_USER_EMAIL_TWO],
        title: "Fake title",
        description: "Fake description",
      }

      // Act
      const actual = await request(app)
        .post(`/${MOCK_REPO_NAME_ONE}/request`)
        .send(mockPullRequest)

      // Assert
      expect(actual.statusCode).toEqual(400)
    })
  })

  describe("/summary", () => {
    beforeAll(async () => {
      await ReviewRequest.create({
        requestorId: MOCK_USER_ID_ONE,
        siteId: MOCK_SITE_ID_ONE,
      })
      const reviewRequest = await ReviewRequest.findOne({
        where: {
          requestorId: MOCK_USER_ID_ONE,
          siteId: MOCK_SITE_ID_ONE,
        },
      })
      await Reviewer.create({
        requestId: reviewRequest?.id,
        reviewerId: MOCK_USER_ID_TWO,
      })
      await ReviewMeta.create({
        reviewId: reviewRequest?.id,
        pullRequestNumber: MOCK_GITHUB_PULL_REQUEST_NUMBER,
        reviewLink: `cms.isomer.gov.sg/sites/${MOCK_REPO_NAME_ONE}/review/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`,
      })
    })

    afterAll(async () => {
      await ReviewMeta.destroy({
        where: {},
      })
      await Reviewer.destroy({
        where: {},
      })
      await ReviewRequest.destroy({
        where: {},
      })
    })

    it("should get the summary of all existing review requests", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )
      mockGenericAxios.get.mockResolvedValueOnce({
        data: MOCK_PULL_REQUEST_ONE,
      })
      mockGenericAxios.get.mockResolvedValueOnce({
        data: [MOCK_GITHUB_RAWCOMMENT_ONE, MOCK_GITHUB_RAWCOMMENT_TWO],
      })
      const expected = {
        reviews: [
          {
            id: String(MOCK_GITHUB_PULL_REQUEST_NUMBER),
            author: MOCK_USER_EMAIL_ONE,
            status: ReviewRequestStatus.Open,
            title: MOCK_PULL_REQUEST_TITLE_ONE,
            description: MOCK_PULL_REQUEST_BODY_ONE,
            changedFiles: MOCK_PULL_REQUEST_CHANGED_FILES_ONE,
            createdAt: new Date(MOCK_GITHUB_DATE_ONE).getTime(),
            newComments: 2,
            firstView: true,
          },
        ],
      }

      // Act
      const actual = await request(app).get(`/${MOCK_REPO_NAME_ONE}/summary`)

      // Assert
      expect(actual.statusCode).toEqual(200)
      expect(actual.body).toMatchObject(expected)
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_TWO
      )

      // Act
      const actual = await request(app).get(`/${MOCK_REPO_NAME_TWO}/summary`)

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if user is not a valid site member", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_THREE,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).get(`/${MOCK_REPO_NAME_ONE}/summary`)

      // Assert
      expect(actual.statusCode).toEqual(404)
    })
  })

  describe("/viewed", () => {})

  describe("/:requestId", () => {})

  describe("/:requestId/viewed", () => {})

  describe("/:requestId/merge", () => {})

  describe("/:requestId/approve", () => {})

  describe("/:requestId/comments", () => {})

  describe("/:requestId/comments/viewedComments", () => {})
})
