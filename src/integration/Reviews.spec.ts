import express from "express"
import mockAxios from "jest-mock-axios"
import request from "supertest"

import { ReviewsRouter as _ReviewsRouter } from "@routes/v2/authenticated/review"
import { SitesRouter as _SitesRouter } from "@routes/v2/authenticated/sites"

import {
  Deployment,
  IsomerAdmin,
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
import { ReviewRequestStatus } from "@root/constants"
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
import { FooterYmlService } from "@root/services/fileServices/YmlFileServices/FooterYmlService"
import { ReviewRequestDto } from "@root/types/dto/review"
import { GitHubService } from "@services/db/GitHubService"
import * as ReviewApi from "@services/db/review"
import { ConfigYmlService } from "@services/fileServices/YmlFileServices/ConfigYmlService"
import { getUsersService, notificationsService } from "@services/identity"
import CollaboratorsService from "@services/identity/CollaboratorsService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import SitesService from "@services/identity/SitesService"
import ReviewRequestService from "@services/review/ReviewRequestService"
import { sequelize } from "@tests/database"

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
const reviewRequestService = new ReviewRequestService(
  (gitHubService as unknown) as typeof ReviewApi,
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

const ReviewsRouter = new _ReviewsRouter(
  reviewRequestService,
  usersService,
  sitesService,
  collaboratorsService,
  notificationsService,
  gitHubService
)
const reviewsSubrouter = ReviewsRouter.getRouter()
const subrouter = express()
subrouter.use("/:siteName", reviewsSubrouter)

const mockGenericAxios = mockAxios.create()
const migrateSpy = jest
  .spyOn(ReviewsRouter, "checkIfSiteIsUnmigrated")
  .mockResolvedValue(true)

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"

describe("Review Requests Integration Tests", () => {
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
    await Notification.sync({ force: true })
    await ReviewMeta.sync({ force: true })
    await Deployment.sync({ force: true })

    await User.create(MOCK_USER_DBENTRY_ONE)
    await User.create(MOCK_USER_DBENTRY_TWO)
    await User.create(MOCK_USER_DBENTRY_THREE)
    await Site.create(MOCK_SITE_DBENTRY_ONE)
    await Deployment.create(MOCK_DEPLOYMENT_DBENTRY_ONE)
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
      mockAxios.get.mockResolvedValue({
        data: { content: MOCK_GITHUB_FRONTMATTER },
      })
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
            stagingUrl: `${MOCK_DEPLOYMENT_DBENTRY_ONE.stagingUrl}${MOCK_PAGE_PERMALINK}`,
            fileUrl: `${FRONTEND_URL}/sites/${MOCK_REPO_NAME_ONE}/homepage`,
            lastEditedBy: MOCK_USER_EMAIL_TWO, // TODO: This should be MOCK_USER_EMAIL_ONE
            lastEditedTime: new Date(MOCK_GITHUB_COMMIT_DATE_THREE).getTime(),
          },
          {
            type: ["page"],
            name: MOCK_GITHUB_FILENAME_ALPHA_TWO,
            path: MOCK_GITHUB_FILEPATH_ALPHA_TWO.split("/").filter((x) => x),
            stagingUrl: `${MOCK_DEPLOYMENT_DBENTRY_ONE.stagingUrl}${MOCK_PAGE_PERMALINK}`,
            fileUrl: `${FRONTEND_URL}/sites/${MOCK_REPO_NAME_ONE}/editPage/${MOCK_GITHUB_FILENAME_ALPHA_TWO}`,
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
      migrateSpy.mockResolvedValueOnce(false)

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

  describe("/viewed", () => {
    beforeAll(async () => {
      await ReviewRequest.create({
        requestorId: MOCK_USER_ID_ONE,
        siteId: MOCK_SITE_ID_ONE,
      })
      await ReviewRequest.create({
        requestorId: MOCK_USER_ID_TWO,
        siteId: MOCK_SITE_ID_ONE,
      })
      await ReviewRequest.create({
        requestorId: MOCK_USER_ID_ONE,
        siteId: MOCK_SITE_ID_TWO,
      })
      const reviewRequest = await ReviewRequest.findOne({
        where: {
          requestorId: MOCK_USER_ID_ONE,
          siteId: MOCK_SITE_ID_ONE,
        },
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
      await ReviewRequestView.destroy({
        where: {},
      })
      await ReviewRequest.destroy({
        where: {},
      })
    })

    it("should mark all existing review requests as viewed for the user", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )

      // Pre-requisite checks
      const countViews = await ReviewRequestView.count({
        where: {
          userId: MOCK_USER_ID_ONE,
          siteId: MOCK_SITE_ID_ONE,
        },
      })
      expect(countViews).toEqual(0)
      const countAnotherUserViews = await ReviewRequestView.count({
        where: {
          userId: MOCK_USER_ID_TWO,
          siteId: MOCK_SITE_ID_ONE,
        },
      })
      expect(countAnotherUserViews).toEqual(0)

      // Act
      const actual = await request(app).post(`/${MOCK_REPO_NAME_ONE}/viewed`)

      // Assert
      expect(actual.statusCode).toEqual(200)
      const countViewsAfter = await ReviewRequestView.count({
        where: {
          userId: MOCK_USER_ID_ONE,
          siteId: MOCK_SITE_ID_ONE,
        },
      })
      expect(countViewsAfter).toEqual(2)
      const countAnotherUserViewsAfter = await ReviewRequestView.count({
        where: {
          userId: MOCK_USER_ID_TWO,
          siteId: MOCK_SITE_ID_ONE,
        },
      })
      expect(countAnotherUserViewsAfter).toEqual(0)
      const countTotalViewsAfter = await ReviewRequestView.count({
        where: {},
      })
      expect(countTotalViewsAfter).toEqual(2)
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_TWO
      )

      // Act
      const actual = await request(app).post(`/${MOCK_REPO_NAME_TWO}/viewed`)

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
      const actual = await request(app).post(`/${MOCK_REPO_NAME_ONE}/viewed`)

      // Assert
      expect(actual.statusCode).toEqual(404)
    })
  })

  describe("/:requestId GET", () => {
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

    it("should return the full details of a review request", async () => {
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
      const expected: ReviewRequestDto = {
        reviewUrl: `cms.isomer.gov.sg/sites/${MOCK_REPO_NAME_ONE}/review/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`,
        title: MOCK_PULL_REQUEST_TITLE_ONE,
        status: ReviewRequestStatus.Open,
        requestor: MOCK_USER_EMAIL_ONE,
        reviewers: [MOCK_USER_EMAIL_TWO],
        reviewRequestedTime: new Date(MOCK_GITHUB_DATE_ONE).getTime(),
        changedItems: [
          {
            type: ["page"],
            name: MOCK_GITHUB_FILENAME_ALPHA_ONE,
            path: [],
            stagingUrl: `${MOCK_DEPLOYMENT_DBENTRY_ONE.stagingUrl}${MOCK_PAGE_PERMALINK}`,
            fileUrl: `${FRONTEND_URL}/sites/${MOCK_REPO_NAME_ONE}/homepage`,
            lastEditedBy: MOCK_USER_EMAIL_TWO, // TODO: This should be MOCK_USER_EMAIL_ONE
            lastEditedTime: new Date(MOCK_GITHUB_COMMIT_DATE_THREE).getTime(),
          },
          {
            type: ["page"],
            name: MOCK_GITHUB_FILENAME_ALPHA_TWO,
            path: MOCK_GITHUB_FILEPATH_ALPHA_TWO.split("/").filter((x) => x),
            stagingUrl: `${MOCK_DEPLOYMENT_DBENTRY_ONE.stagingUrl}${MOCK_PAGE_PERMALINK}`,
            fileUrl: `${FRONTEND_URL}/sites/${MOCK_REPO_NAME_ONE}/editPage/${MOCK_GITHUB_FILENAME_ALPHA_TWO}`,
            lastEditedBy: MOCK_USER_EMAIL_TWO,
            lastEditedTime: new Date(MOCK_GITHUB_COMMIT_DATE_THREE).getTime(),
          },
        ],
      }

      // Act
      const actual = await request(app).get(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`
      )

      // Assert
      expect(actual.statusCode).toEqual(200)
      expect(actual.body).toEqual({ reviewRequest: expected })
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_TWO
      )
      migrateSpy.mockResolvedValueOnce(false)

      // Act
      const actual = await request(app).get(
        `/${MOCK_REPO_NAME_TWO}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`
      )

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
      const actual = await request(app).get(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if review request is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).get(`/${MOCK_REPO_NAME_ONE}/123456`)

      // Assert
      expect(actual.statusCode).toEqual(404)
    })
  })

  describe("/:requestId POST", () => {
    beforeAll(async () => {
      await ReviewRequest.create({
        requestorId: MOCK_USER_ID_TWO,
        siteId: MOCK_SITE_ID_ONE,
      })
      const reviewRequest = await ReviewRequest.findOne({
        where: {
          requestorId: MOCK_USER_ID_TWO,
          siteId: MOCK_SITE_ID_ONE,
        },
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

    it("should update the review request successfully", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )

      // Pre-requisite checks
      const reviewerCount = await Reviewer.count({
        where: {},
      })
      expect(reviewerCount).toEqual(0)

      // Act
      const actual = await request(app)
        .post(`/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`)
        .send({
          reviewers: [MOCK_USER_EMAIL_ONE],
        })

      // Assert
      expect(actual.statusCode).toEqual(200)
      const reviewerCountAfter = await Reviewer.count({
        where: {},
      })
      expect(reviewerCountAfter).toEqual(1)
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_TWO
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_TWO}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if the review request is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).post(`/${MOCK_REPO_NAME_ONE}/123456`)

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 403 if user is not the original requestor", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`
      )

      // Assert
      expect(actual.statusCode).toEqual(403)
    })

    it("should return 400 if provided reviewers are not admins of the site", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app)
        .post(`/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`)
        .send({
          reviewers: [MOCK_USER_EMAIL_THREE],
        })

      // Assert
      expect(actual.statusCode).toEqual(400)
    })
  })

  describe("/:requestId DELETE", () => {
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
      await ReviewRequestView.create({
        reviewRequestId: reviewRequest?.id,
        userId: MOCK_USER_ID_ONE,
        siteId: MOCK_SITE_ID_ONE,
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
      await ReviewRequestView.destroy({
        where: {},
      })
      await ReviewRequest.destroy({
        where: {},
      })
    })

    it("should close the review request successfully", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )
      mockGenericAxios.patch.mockResolvedValueOnce(null)

      // Act
      const actual = await request(app).delete(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`
      )

      // Assert
      expect(actual.statusCode).toEqual(200)
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_TWO
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_TWO}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if the review request is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).post(`/${MOCK_REPO_NAME_ONE}/123456`)

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 403 if user is not the original requestor", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`
      )

      // Assert
      expect(actual.statusCode).toEqual(403)
    })

    it("should return 403 if the user is not a valid site member", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_THREE,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`
      )

      // Assert
      expect(actual.statusCode).toEqual(403)
    })
  })

  describe("/:requestId/viewed", () => {
    beforeAll(async () => {
      await ReviewRequest.create({
        requestorId: MOCK_USER_ID_ONE,
        siteId: MOCK_SITE_ID_ONE,
      })
      await ReviewRequest.create({
        requestorId: MOCK_USER_ID_TWO,
        siteId: MOCK_SITE_ID_ONE,
      })
      await ReviewRequest.create({
        requestorId: MOCK_USER_ID_ONE,
        siteId: MOCK_SITE_ID_TWO,
      })
      const reviewRequest = await ReviewRequest.findOne({
        where: {
          requestorId: MOCK_USER_ID_ONE,
          siteId: MOCK_SITE_ID_ONE,
        },
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
      await ReviewRequestView.destroy({
        where: {},
      })
      await ReviewRequest.destroy({
        where: {},
      })
    })

    it("should mark the review request as viewed for the user", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )

      // Pre-requisite checks
      const countViews = await ReviewRequestView.count({
        where: {},
      })
      expect(countViews).toEqual(0)

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/viewed`
      )

      // Assert
      expect(actual.statusCode).toEqual(200)
      const countViewsAfter = await ReviewRequestView.count({
        where: {
          userId: MOCK_USER_ID_ONE,
          siteId: MOCK_SITE_ID_ONE,
        },
      })
      expect(countViewsAfter).toEqual(1)
      const countAnotherUserViewsAfter = await ReviewRequestView.count({
        where: {
          userId: MOCK_USER_ID_TWO,
          siteId: MOCK_SITE_ID_ONE,
        },
      })
      expect(countAnotherUserViewsAfter).toEqual(0)
      const countTotalViewsAfter = await ReviewRequestView.count({
        where: {},
      })
      expect(countTotalViewsAfter).toEqual(1)
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_TWO
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_TWO}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/viewed`
      )

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
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/viewed`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if review request is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/123456/viewed`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })
  })

  describe("/:requestId/merge", () => {
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
      await ReviewRequestView.create({
        reviewRequestId: reviewRequest?.id,
        siteId: MOCK_SITE_ID_ONE,
        userId: MOCK_USER_ID_ONE,
      })
      await ReviewRequestView.create({
        reviewRequestId: reviewRequest?.id,
        siteId: MOCK_SITE_ID_ONE,
        userId: MOCK_USER_ID_TWO,
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

    it("should merge the pull request successfully", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )
      mockGenericAxios.post.mockResolvedValueOnce(null)
      mockGenericAxios.put.mockResolvedValueOnce(null)

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/merge`
      )

      // Assert
      expect(actual.statusCode).toEqual(200)
      const reviewRequest = await ReviewRequest.findOne({
        where: {
          requestorId: MOCK_USER_ID_ONE,
          siteId: MOCK_SITE_ID_ONE,
        },
      })
      expect(reviewRequest?.reviewStatus).toEqual(ReviewRequestStatus.Merged)
      const countViews = await ReviewRequestView.count({
        where: {},
      })
      expect(countViews).toEqual(0)
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_TWO
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_TWO}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/merge`
      )

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
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/merge`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if review request is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/123456/merge`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })
  })

  describe("/:requestId/approve POST", () => {
    beforeEach(async () => {
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

    afterEach(async () => {
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

    it("should allow the reviewer to approve the pull request", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/approve`
      )

      // Assert
      expect(actual.statusCode).toEqual(200)
      const reviewRequest = await ReviewRequest.findOne({
        where: {
          requestorId: MOCK_USER_ID_ONE,
          siteId: MOCK_SITE_ID_ONE,
        },
      })
      expect(reviewRequest?.reviewStatus).toEqual(ReviewRequestStatus.Approved)
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_TWO
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_TWO}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/approve`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if review request is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/123456/approve`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 403 if user is not a valid site member", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_THREE,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/approve`
      )
      console.log(actual.error)

      // Assert
      expect(actual.statusCode).toEqual(403)
    })

    it("should return 403 if site member is not a reviewer", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/approve`
      )
      console.log(actual.error)

      // Assert
      expect(actual.statusCode).toEqual(403)
    })
  })

  describe("/:requestId/approve DELETE", () => {
    beforeAll(async () => {
      await ReviewRequest.create({
        requestorId: MOCK_USER_ID_ONE,
        siteId: MOCK_SITE_ID_ONE,
        reviewStatus: ReviewRequestStatus.Approved,
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

    it("should allow the reviewer to unapprove the pull request", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).delete(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/approve`
      )

      // Assert
      expect(actual.statusCode).toEqual(200)
      const reviewRequest = await ReviewRequest.findOne({
        where: {
          requestorId: MOCK_USER_ID_ONE,
          siteId: MOCK_SITE_ID_ONE,
        },
      })
      expect(reviewRequest?.reviewStatus).toEqual(ReviewRequestStatus.Open)
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_TWO
      )

      // Act
      const actual = await request(app).delete(
        `/${MOCK_REPO_NAME_TWO}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/approve`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if review request is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).delete(
        `/${MOCK_REPO_NAME_ONE}/123456/approve`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if the user is not a reviewer of the RR", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_ONE,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).delete(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/approve`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if the user is not a valid site member", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_THREE,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).delete(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/approve`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })
  })

  describe("/:requestId/comments GET", () => {
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

    it("should retrieve the comments for the review request", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )
      mockGenericAxios.get.mockResolvedValueOnce({
        data: [MOCK_GITHUB_RAWCOMMENT_ONE, MOCK_GITHUB_RAWCOMMENT_TWO],
      })
      const expected = [
        {
          user: MOCK_USER_EMAIL_ONE,
          message: MOCK_GITHUB_COMMENT_BODY_ONE,
          createdAt: new Date(MOCK_GITHUB_COMMIT_DATE_ONE).getTime(),
          isRead: false,
        },
        {
          user: MOCK_USER_EMAIL_TWO,
          message: MOCK_GITHUB_COMMENT_BODY_TWO,
          createdAt: new Date(MOCK_GITHUB_COMMIT_DATE_THREE).getTime(),
          isRead: false,
        },
      ]

      // Act
      const actual = await request(app).get(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/comments`
      )

      // Assert
      expect(actual.statusCode).toEqual(200)
      expect(actual.body).toEqual(expected)
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_TWO
      )
      migrateSpy.mockResolvedValueOnce(false)

      // Act
      const actual = await request(app).get(
        `/${MOCK_REPO_NAME_TWO}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/comments`
      )

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
      const actual = await request(app).get(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/comments`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if review request is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).get(
        `/${MOCK_REPO_NAME_ONE}/123456/comments`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })
  })

  describe("/:requestId/comments POST", () => {
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
      await ReviewRequest.destroy({
        where: {},
      })
    })

    it("should create a new comment for a review request", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )
      mockGenericAxios.post.mockResolvedValueOnce(null)

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/comments`
      )

      // Assert
      expect(actual.statusCode).toEqual(200)
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_TWO
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_TWO}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/comments`
      )

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
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/comments`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if review request is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/123456/comments`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })
  })

  describe("/:requestId/comments/viewedComments", () => {
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
      await ReviewMeta.create({
        reviewId: reviewRequest?.id,
        pullRequestNumber: MOCK_GITHUB_PULL_REQUEST_NUMBER,
        reviewLink: `cms.isomer.gov.sg/sites/${MOCK_REPO_NAME_ONE}/review/${MOCK_GITHUB_PULL_REQUEST_NUMBER}`,
      })

      // Avoid race conditions when checking between expected and actual date values
      jest.useFakeTimers("modern")
      jest.setSystemTime(new Date(MOCK_GITHUB_COMMIT_DATE_ONE).getTime())
    })

    afterAll(async () => {
      await ReviewMeta.destroy({
        where: {},
      })
      await ReviewRequestView.destroy({
        where: {},
      })
      await ReviewRequest.destroy({
        where: {},
      })
      jest.useRealTimers()
    })

    it("should update last viewed timestamp when the user views the review request", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )

      // Pre-requisite checks
      const countViews = await ReviewRequestView.count({
        where: {},
      })
      expect(countViews).toEqual(0)

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/comments/viewedComments`
      )

      // Assert
      expect(actual.statusCode).toEqual(200)
      const reviewRequestView = await ReviewRequestView.findOne({
        where: {
          userId: MOCK_USER_ID_TWO,
          siteId: MOCK_SITE_ID_ONE,
        },
      })
      expect(reviewRequestView?.lastViewedAt).toEqual(
        new Date(MOCK_GITHUB_COMMIT_DATE_ONE)
      )
    })

    it("should return 404 if site is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_TWO
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_TWO}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/comments/viewedComments`
      )

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
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/${MOCK_GITHUB_PULL_REQUEST_NUMBER}/comments/viewedComments`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })

    it("should return 404 if review request is not found", async () => {
      // Arrange
      const app = generateRouterForUserWithSite(
        subrouter,
        MOCK_USER_SESSION_DATA_TWO,
        MOCK_REPO_NAME_ONE
      )

      // Act
      const actual = await request(app).post(
        `/${MOCK_REPO_NAME_ONE}/123456/comments/viewedComments`
      )

      // Assert
      expect(actual.statusCode).toEqual(404)
    })
  })
})
