import _ from "lodash"
import { Attributes, ModelStatic } from "sequelize"

import {
  ReviewRequest,
  ReviewMeta,
  ReviewRequestView,
  User,
  Reviewer,
  Site,
} from "@database/models"
import { ReviewRequestStatus } from "@root/constants"
import RequestNotFoundError from "@root/errors/RequestNotFoundError"
import {
  mockCollaboratorAdmin1,
  mockCollaboratorAdmin2,
  mockCollaboratorContributor1,
  mockSiteOrmResponseWithAllCollaborators,
  MOCK_COMMIT_FILEPATH_TWO,
  MOCK_COMMIT_MESSAGE_ONE,
  MOCK_COMMIT_MESSAGE_TWO,
  MOCK_GITHUB_COMMENT_DATA_ONE,
  MOCK_GITHUB_COMMENT_DATA_TWO,
  MOCK_GITHUB_COMMENT_ONE,
  MOCK_GITHUB_COMMENT_TWO,
  MOCK_GITHUB_COMMIT_AUTHOR_ONE,
  MOCK_GITHUB_COMMIT_AUTHOR_TWO,
  MOCK_GITHUB_DATE_ONE,
  MOCK_GITHUB_DATE_TWO,
  MOCK_GITHUB_EMAIL_ADDRESS_ONE,
  MOCK_GITHUB_EMAIL_ADDRESS_TWO,
  MOCK_GITHUB_NAME_ONE,
  MOCK_GITHUB_NAME_TWO,
  MOCK_IDENTITY_EMAIL_ONE,
  MOCK_IDENTITY_EMAIL_THREE,
  MOCK_IDENTITY_EMAIL_TWO,
} from "@root/fixtures/identity"
import {
  MOCK_PULL_REQUEST_COMMIT_ONE,
  MOCK_PULL_REQUEST_COMMIT_TWO,
  MOCK_PULL_REQUEST_FILECHANGEINFO_ONE,
  MOCK_PULL_REQUEST_FILECHANGEINFO_TWO,
  MOCK_PULL_REQUEST_FILE_FILENAME_ONE,
  MOCK_PULL_REQUEST_FILE_FILENAME_TWO,
  MOCK_PULL_REQUEST_ONE,
  MOCK_REVIEW_REQUEST_ONE,
  MOCK_REVIEW_REQUEST_VIEW_ONE,
} from "@root/fixtures/review"
import { mockUserWithSiteSessionData } from "@root/fixtures/sessionData"
import { EditedItemDto, GithubCommentData } from "@root/types/dto/review"
import { Commit } from "@root/types/github"
import * as ReviewApi from "@services/db/review"
import _ReviewRequestService from "@services/review/ReviewRequestService"

const MockReviewApi = {
  approvePullRequest: jest.fn(),
  closeReviewRequest: jest.fn(),
  createComment: jest.fn(),
  createPullRequest: jest.fn(),
  mergePullRequest: jest.fn(),
  getComments: jest.fn(),
  getCommitDiff: jest.fn(),
  getPullRequest: jest.fn(),
}

const MockUsersRepository = {
  findByPk: jest.fn(),
}

const MockReviewRequestRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
}

const MockReviewersRepository = {
  create: jest.fn(),
}

const MockReviewMetaRepository = {
  create: jest.fn(),
}

const MockReviewRequestViewRepository = {
  count: jest.fn(),
  create: jest.fn(),
  destroy: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  upsert: jest.fn(),
}

const MockReviewRequest = {
  ...MOCK_REVIEW_REQUEST_ONE,
  $set: jest.fn(),
  save: jest.fn(),
}

const ReviewRequestService = new _ReviewRequestService(
  (MockReviewApi as unknown) as typeof ReviewApi,
  (MockUsersRepository as unknown) as ModelStatic<User>,
  (MockReviewRequestRepository as unknown) as ModelStatic<ReviewRequest>,
  (MockReviewersRepository as unknown) as ModelStatic<Reviewer>,
  (MockReviewMetaRepository as unknown) as ModelStatic<ReviewMeta>,
  (MockReviewRequestViewRepository as unknown) as ModelStatic<ReviewRequestView>
)

const SpyReviewRequestService = {
  computeCommentData: jest.spyOn(ReviewRequestService, "computeCommentData"),
  computeFileType: jest.spyOn(ReviewRequestService, "computeFileType"),
  computeFileUrl: jest.spyOn(ReviewRequestService, "computeFileUrl"),
  computeShaMappings: jest.spyOn(ReviewRequestService, "computeShaMappings"),
  getComments: jest.spyOn(ReviewRequestService, "getComments"),
  getReviewRequest: jest.spyOn(ReviewRequestService, "getReviewRequest"),
}

describe("ReviewRequestService", () => {
  // Prevent inter-test pollution of mocks
  afterEach(() => jest.clearAllMocks())

  describe("compareDiff", () => {
    it("should return an array of edited item objects", async () => {
      // Arrange
      const mockCommitDiff = {
        files: [
          MOCK_PULL_REQUEST_FILECHANGEINFO_ONE,
          MOCK_PULL_REQUEST_FILECHANGEINFO_TWO,
        ],
        commits: [MOCK_PULL_REQUEST_COMMIT_ONE, MOCK_PULL_REQUEST_COMMIT_TWO],
      }
      const expected = [
        {
          type: ["page"],
          name: MOCK_PULL_REQUEST_FILE_FILENAME_ONE,
          path: [],
          url: "www.google.com",
          lastEditedBy: MOCK_GITHUB_NAME_ONE,
          lastEditedTime: new Date(MOCK_GITHUB_DATE_ONE).getTime(),
        },
        {
          type: ["page"],
          name: MOCK_PULL_REQUEST_FILE_FILENAME_TWO,
          path: MOCK_COMMIT_FILEPATH_TWO.split("/"),
          url: "www.google.com",
          lastEditedBy: MOCK_GITHUB_NAME_TWO,
          lastEditedTime: new Date(MOCK_GITHUB_DATE_TWO).getTime(),
        },
      ]
      MockReviewApi.getCommitDiff.mockResolvedValueOnce(mockCommitDiff)

      // Act
      const actual = await ReviewRequestService.compareDiff(
        mockUserWithSiteSessionData
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(SpyReviewRequestService.computeShaMappings).toHaveBeenCalled()
      expect(SpyReviewRequestService.computeFileType).toHaveBeenCalled()
      expect(SpyReviewRequestService.computeFileUrl).toHaveBeenCalled()
    })

    it("should return an empty array if there are no file changes or commits", async () => {
      // Arrange
      const mockCommitDiff = {
        files: [],
        commits: [],
      }
      const expected: EditedItemDto[] = []
      MockReviewApi.getCommitDiff.mockResolvedValueOnce(mockCommitDiff)

      // Act
      const actual = await ReviewRequestService.compareDiff(
        mockUserWithSiteSessionData
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(SpyReviewRequestService.computeShaMappings).toHaveBeenCalled()
      expect(SpyReviewRequestService.computeFileType).not.toHaveBeenCalled()
      expect(SpyReviewRequestService.computeFileUrl).not.toHaveBeenCalled()
    })

    it("should return an empty array if there are no file changes only", async () => {
      // Arrange
      const mockCommitDiff = {
        files: [],
        commits: [MOCK_PULL_REQUEST_COMMIT_ONE, MOCK_PULL_REQUEST_COMMIT_TWO],
      }
      const expected: EditedItemDto[] = []
      MockReviewApi.getCommitDiff.mockResolvedValueOnce(mockCommitDiff)

      // Act
      const actual = await ReviewRequestService.compareDiff(
        mockUserWithSiteSessionData
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(SpyReviewRequestService.computeShaMappings).toHaveBeenCalled()
      expect(SpyReviewRequestService.computeFileType).not.toHaveBeenCalled()
      expect(SpyReviewRequestService.computeFileUrl).not.toHaveBeenCalled()
    })
  })

  describe("computeFileType", () => {
    // TODO
    it("should return the correct file type", () => {
      // Arrange
      const expected = ["page"]

      // Act
      const actual = ReviewRequestService.computeFileType("filename")

      // Assert
      expect(actual).toEqual(expected)
    })
  })

  describe("computeFileUrl", () => {
    // TODO
    it("should return the correct file URL", () => {
      // Arrange
      const expected = "www.google.com"

      // Act
      const actual = ReviewRequestService.computeFileUrl("filename", "siteName")

      // Assert
      expect(actual).toEqual(expected)
    })
  })

  describe("computeShaMappings", () => {
    it("should return the correct sha mappings for pure identity commits", async () => {
      // Arrange
      const mockCommits: Commit[] = [
        MOCK_PULL_REQUEST_COMMIT_ONE,
        MOCK_PULL_REQUEST_COMMIT_TWO,
      ]
      const expected = {
        [MOCK_PULL_REQUEST_COMMIT_ONE.sha]: {
          author: MOCK_IDENTITY_EMAIL_ONE,
          unixTime: new Date(MOCK_GITHUB_DATE_ONE).getTime(),
        },
        [MOCK_PULL_REQUEST_COMMIT_TWO.sha]: {
          author: MOCK_IDENTITY_EMAIL_TWO,
          unixTime: new Date(MOCK_GITHUB_DATE_TWO).getTime(),
        },
      }
      MockUsersRepository.findByPk.mockResolvedValueOnce({
        email: MOCK_IDENTITY_EMAIL_ONE,
      })
      MockUsersRepository.findByPk.mockResolvedValueOnce({
        email: MOCK_IDENTITY_EMAIL_TWO,
      })

      // Act
      const actual = await ReviewRequestService.computeShaMappings(mockCommits)

      // Assert
      expect(actual).toEqual(expected)
      expect(MockUsersRepository.findByPk).toHaveBeenCalledTimes(2)
    })

    it("should return the correct sha mappings for non-identity commits", async () => {
      // Arrange
      const mockNonIdentityCommitOne = _.set(
        _.clone(MOCK_PULL_REQUEST_COMMIT_ONE),
        "commit.message",
        MOCK_COMMIT_MESSAGE_ONE
      )
      const mockNonIdentityCommitTwo = _.set(
        _.clone(MOCK_PULL_REQUEST_COMMIT_TWO),
        "commit.message",
        MOCK_COMMIT_MESSAGE_TWO
      )

      const mockCommits: Commit[] = [
        mockNonIdentityCommitOne,
        mockNonIdentityCommitTwo,
      ]
      const expected = {
        [MOCK_PULL_REQUEST_COMMIT_ONE.sha]: {
          author: MOCK_GITHUB_NAME_ONE,
          unixTime: new Date(MOCK_GITHUB_DATE_ONE).getTime(),
        },
        [MOCK_PULL_REQUEST_COMMIT_TWO.sha]: {
          author: MOCK_GITHUB_NAME_TWO,
          unixTime: new Date(MOCK_GITHUB_DATE_TWO).getTime(),
        },
      }
      MockUsersRepository.findByPk.mockResolvedValueOnce(null)
      MockUsersRepository.findByPk.mockResolvedValueOnce(null)

      // Act
      const actual = await ReviewRequestService.computeShaMappings(mockCommits)

      // Assert
      expect(actual).toEqual(expected)
      expect(MockUsersRepository.findByPk).toHaveBeenCalledTimes(2)
      expect(MockUsersRepository.findByPk).toHaveBeenNthCalledWith(1, undefined)
      expect(MockUsersRepository.findByPk).toHaveBeenNthCalledWith(2, undefined)
    })

    it("should return an empty object if there are no commits", async () => {
      // Arrange
      const mockCommits: Commit[] = []
      const expected = {}

      // Act
      const actual = await ReviewRequestService.computeShaMappings(mockCommits)

      // Assert
      expect(actual).toEqual(expected)
      expect(MockUsersRepository.findByPk).not.toHaveBeenCalled()
    })
  })

  describe("computeCommentData", () => {
    it("should return the correct comment objects with a valid viewedTime", async () => {
      // Arrange
      const mockComments: GithubCommentData[] = [
        MOCK_GITHUB_COMMENT_DATA_ONE,
        MOCK_GITHUB_COMMENT_DATA_TWO,
      ]
      const mockViewedTime = new Date("2022-09-23T00:00:00Z")
      const expected = [
        {
          user: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
          message: MOCK_GITHUB_COMMENT_ONE,
          createdAt: new Date(MOCK_GITHUB_DATE_ONE).getTime(),
          isRead: true,
        },
        {
          user: MOCK_GITHUB_EMAIL_ADDRESS_TWO,
          message: MOCK_GITHUB_COMMENT_TWO,
          createdAt: new Date(MOCK_GITHUB_DATE_TWO).getTime(),
          isRead: false,
        },
      ]
      MockUsersRepository.findByPk.mockResolvedValueOnce(
        MOCK_GITHUB_COMMIT_AUTHOR_ONE
      )
      MockUsersRepository.findByPk.mockResolvedValueOnce(
        MOCK_GITHUB_COMMIT_AUTHOR_TWO
      )

      // Act
      const actual = await ReviewRequestService.computeCommentData(
        mockComments,
        mockViewedTime
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockUsersRepository.findByPk).toHaveBeenCalledTimes(2)
    })

    it("should return the correct comment objects with viewedTime being null", async () => {
      // Arrange
      const mockComments: GithubCommentData[] = [
        MOCK_GITHUB_COMMENT_DATA_ONE,
        MOCK_GITHUB_COMMENT_DATA_TWO,
      ]
      const expected = [
        {
          user: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
          message: MOCK_GITHUB_COMMENT_ONE,
          createdAt: new Date(MOCK_GITHUB_DATE_ONE).getTime(),
          isRead: false,
        },
        {
          user: MOCK_GITHUB_EMAIL_ADDRESS_TWO,
          message: MOCK_GITHUB_COMMENT_TWO,
          createdAt: new Date(MOCK_GITHUB_DATE_TWO).getTime(),
          isRead: false,
        },
      ]
      MockUsersRepository.findByPk.mockResolvedValueOnce(
        MOCK_GITHUB_COMMIT_AUTHOR_ONE
      )
      MockUsersRepository.findByPk.mockResolvedValueOnce(
        MOCK_GITHUB_COMMIT_AUTHOR_TWO
      )

      // Act
      const actual = await ReviewRequestService.computeCommentData(
        mockComments,
        null
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockUsersRepository.findByPk).toHaveBeenCalledTimes(2)
    })

    it("should return empty email string if user is not found", async () => {
      // Arrange
      const mockComments: GithubCommentData[] = [
        MOCK_GITHUB_COMMENT_DATA_ONE,
        MOCK_GITHUB_COMMENT_DATA_TWO,
      ]
      const expected = [
        {
          user: "",
          message: MOCK_GITHUB_COMMENT_ONE,
          createdAt: new Date(MOCK_GITHUB_DATE_ONE).getTime(),
          isRead: false,
        },
        {
          user: "",
          message: MOCK_GITHUB_COMMENT_TWO,
          createdAt: new Date(MOCK_GITHUB_DATE_TWO).getTime(),
          isRead: false,
        },
      ]
      MockUsersRepository.findByPk.mockResolvedValueOnce(null)
      MockUsersRepository.findByPk.mockResolvedValueOnce(null)

      // Act
      const actual = await ReviewRequestService.computeCommentData(
        mockComments,
        null
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockUsersRepository.findByPk).toHaveBeenCalledTimes(2)
    })

    it("should return empty array if there are no comments", async () => {
      // Arrange
      const mockComments: GithubCommentData[] = []

      // Act
      const actual = await ReviewRequestService.computeCommentData(
        mockComments,
        null
      )

      // Assert
      expect(actual).toEqual([])
      expect(MockUsersRepository.findByPk).not.toHaveBeenCalled()
    })
  })

  describe("createReviewRequest", () => {
    it("should create the review request successfully", async () => {
      // Arrange
      const mockReviewers = [mockCollaboratorAdmin1, mockCollaboratorAdmin2]
      const mockRequestor = mockCollaboratorContributor1
      const mockSite = mockSiteOrmResponseWithAllCollaborators as Attributes<Site>
      const mockTitle = "test title"
      const mockDescription = "test description"
      const mockPullRequestNumber = MOCK_REVIEW_REQUEST_ONE.id
      const expected = mockPullRequestNumber
      MockReviewApi.createPullRequest.mockResolvedValueOnce(
        mockPullRequestNumber
      )
      MockReviewRequestRepository.create.mockResolvedValueOnce(
        MOCK_REVIEW_REQUEST_ONE
      )
      MockReviewersRepository.create.mockResolvedValueOnce(undefined)
      MockReviewersRepository.create.mockResolvedValueOnce(undefined)
      MockReviewMetaRepository.create.mockResolvedValueOnce(undefined)

      // Act
      const actual = await ReviewRequestService.createReviewRequest(
        mockUserWithSiteSessionData,
        mockReviewers,
        mockRequestor,
        mockSite,
        mockTitle,
        mockDescription
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockReviewApi.createPullRequest).toHaveBeenCalledWith(
        mockUserWithSiteSessionData.siteName,
        mockTitle,
        mockDescription
      )
      expect(MockReviewRequestRepository.create).toHaveBeenCalledWith({
        requestorId: mockRequestor.id,
        siteId: mockSite.id,
      })
      expect(MockReviewersRepository.create).toHaveBeenNthCalledWith(1, {
        requestId: MOCK_REVIEW_REQUEST_ONE.id,
        reviewerId: mockCollaboratorAdmin1.id,
      })
      expect(MockReviewersRepository.create).toHaveBeenNthCalledWith(2, {
        requestId: MOCK_REVIEW_REQUEST_ONE.id,
        reviewerId: mockCollaboratorAdmin2.id,
      })
      expect(MockReviewMetaRepository.create).toHaveBeenCalledWith({
        reviewId: MOCK_REVIEW_REQUEST_ONE.id,
        pullRequestNumber: mockPullRequestNumber,
        reviewLink: `cms.isomer.gov.sg/sites/${mockUserWithSiteSessionData.siteName}/review/${mockPullRequestNumber}`,
      })
    })
  })

  describe("listReviewRequest", () => {
    // NOTE: We are only assuming one review request is returned
    it("should return an array of basic review request objects not viewed before", async () => {
      // Arrange
      const expected = [
        {
          id: MOCK_REVIEW_REQUEST_ONE.id,
          author: MOCK_IDENTITY_EMAIL_ONE,
          status: MOCK_REVIEW_REQUEST_ONE.reviewStatus,
          title: MOCK_PULL_REQUEST_ONE.title,
          description: MOCK_PULL_REQUEST_ONE.body,
          changedFiles: MOCK_PULL_REQUEST_ONE.changed_files,
          createdAt: new Date(MOCK_PULL_REQUEST_ONE.created_at).getTime(),
          newComments: 2,
          firstView: true,
        },
      ]
      MockReviewRequestRepository.findAll.mockResolvedValueOnce([
        MOCK_REVIEW_REQUEST_ONE,
      ])
      MockReviewApi.getPullRequest.mockResolvedValueOnce(MOCK_PULL_REQUEST_ONE)
      MockReviewRequestViewRepository.count.mockResolvedValueOnce(0)
      MockReviewApi.getComments.mockResolvedValueOnce([
        MOCK_GITHUB_COMMENT_DATA_ONE,
        MOCK_GITHUB_COMMENT_DATA_TWO,
      ])
      MockReviewRequestViewRepository.findOne.mockResolvedValueOnce(null)
      MockUsersRepository.findByPk.mockResolvedValueOnce({
        email: MOCK_IDENTITY_EMAIL_ONE,
      })
      MockUsersRepository.findByPk.mockResolvedValueOnce({
        email: MOCK_IDENTITY_EMAIL_TWO,
      })

      // Act
      const actual = await ReviewRequestService.listReviewRequest(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockReviewRequestRepository.findAll).toHaveBeenCalled()
      expect(MockReviewApi.getPullRequest).toHaveBeenCalledWith(
        mockUserWithSiteSessionData.siteName,
        MOCK_REVIEW_REQUEST_ONE.reviewMeta.pullRequestNumber
      )
      expect(MockReviewRequestViewRepository.count).toHaveBeenCalled()
      expect(SpyReviewRequestService.getComments).toHaveBeenCalledWith(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.reviewMeta.pullRequestNumber
      )
      expect(MockReviewApi.getComments).toHaveBeenCalledWith(
        mockUserWithSiteSessionData.siteName,
        MOCK_REVIEW_REQUEST_ONE.reviewMeta.pullRequestNumber
      )
      expect(SpyReviewRequestService.computeCommentData).toHaveBeenCalled()
      expect(MockUsersRepository.findByPk).toHaveBeenCalledTimes(2)
    })

    it("should return an array of basic review request objects with a mix of read and unread comments", async () => {
      // Arrange
      const expected = [
        {
          id: MOCK_REVIEW_REQUEST_ONE.id,
          author: MOCK_IDENTITY_EMAIL_ONE,
          status: MOCK_REVIEW_REQUEST_ONE.reviewStatus,
          title: MOCK_PULL_REQUEST_ONE.title,
          description: MOCK_PULL_REQUEST_ONE.body,
          changedFiles: MOCK_PULL_REQUEST_ONE.changed_files,
          createdAt: new Date(MOCK_PULL_REQUEST_ONE.created_at).getTime(),
          newComments: 1,
          firstView: false,
        },
      ]
      MockReviewRequestRepository.findAll.mockResolvedValueOnce([
        MOCK_REVIEW_REQUEST_ONE,
      ])
      MockReviewApi.getPullRequest.mockResolvedValueOnce(MOCK_PULL_REQUEST_ONE)
      MockReviewRequestViewRepository.count.mockResolvedValueOnce(1)
      MockReviewApi.getComments.mockResolvedValueOnce([
        MOCK_GITHUB_COMMENT_DATA_ONE,
        MOCK_GITHUB_COMMENT_DATA_TWO,
      ])
      MockReviewRequestViewRepository.findOne.mockResolvedValueOnce(
        MOCK_REVIEW_REQUEST_VIEW_ONE
      )
      MockUsersRepository.findByPk.mockResolvedValueOnce({
        email: MOCK_IDENTITY_EMAIL_ONE,
      })
      MockUsersRepository.findByPk.mockResolvedValueOnce({
        email: MOCK_IDENTITY_EMAIL_TWO,
      })

      // Act
      const actual = await ReviewRequestService.listReviewRequest(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockReviewRequestRepository.findAll).toHaveBeenCalled()
      expect(MockReviewApi.getPullRequest).toHaveBeenCalledWith(
        mockUserWithSiteSessionData.siteName,
        MOCK_REVIEW_REQUEST_ONE.reviewMeta.pullRequestNumber
      )
      expect(MockReviewRequestViewRepository.count).toHaveBeenCalled()
      expect(SpyReviewRequestService.getComments).toHaveBeenCalledWith(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.reviewMeta.pullRequestNumber
      )
      expect(MockReviewApi.getComments).toHaveBeenCalledWith(
        mockUserWithSiteSessionData.siteName,
        MOCK_REVIEW_REQUEST_ONE.reviewMeta.pullRequestNumber
      )
      expect(SpyReviewRequestService.computeCommentData).toHaveBeenCalled()
      expect(MockUsersRepository.findByPk).toHaveBeenCalledTimes(2)
    })

    it("should return an array of basic review request objects with no comments", async () => {
      // Arrange
      const expected = [
        {
          id: MOCK_REVIEW_REQUEST_ONE.id,
          author: MOCK_IDENTITY_EMAIL_ONE,
          status: MOCK_REVIEW_REQUEST_ONE.reviewStatus,
          title: MOCK_PULL_REQUEST_ONE.title,
          description: MOCK_PULL_REQUEST_ONE.body,
          changedFiles: MOCK_PULL_REQUEST_ONE.changed_files,
          createdAt: new Date(MOCK_PULL_REQUEST_ONE.created_at).getTime(),
          newComments: 0,
          firstView: false,
        },
      ]
      MockReviewRequestRepository.findAll.mockResolvedValueOnce([
        MOCK_REVIEW_REQUEST_ONE,
      ])
      MockReviewApi.getPullRequest.mockResolvedValueOnce(MOCK_PULL_REQUEST_ONE)
      MockReviewRequestViewRepository.count.mockResolvedValueOnce(1)
      MockReviewApi.getComments.mockResolvedValueOnce([])
      MockReviewRequestViewRepository.findOne.mockResolvedValueOnce(
        MOCK_REVIEW_REQUEST_VIEW_ONE
      )

      // Act
      const actual = await ReviewRequestService.listReviewRequest(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockReviewRequestRepository.findAll).toHaveBeenCalled()
      expect(MockReviewApi.getPullRequest).toHaveBeenCalledWith(
        mockUserWithSiteSessionData.siteName,
        MOCK_REVIEW_REQUEST_ONE.reviewMeta.pullRequestNumber
      )
      expect(MockReviewRequestViewRepository.count).toHaveBeenCalled()
      expect(SpyReviewRequestService.getComments).toHaveBeenCalledWith(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.reviewMeta.pullRequestNumber
      )
      expect(MockReviewApi.getComments).toHaveBeenCalledWith(
        mockUserWithSiteSessionData.siteName,
        MOCK_REVIEW_REQUEST_ONE.reviewMeta.pullRequestNumber
      )
      expect(SpyReviewRequestService.computeCommentData).toHaveBeenCalled()
      expect(MockUsersRepository.findByPk).not.toHaveBeenCalled()
    })
  })

  describe("markAllReviewRequestsAsViewed", () => {
    it("should mark all review requests as viewed successfully", async () => {
      // Arrange
      MockReviewRequestViewRepository.findAll.mockResolvedValueOnce([])
      MockReviewRequestRepository.findAll.mockResolvedValueOnce([
        MOCK_REVIEW_REQUEST_ONE,
      ])
      MockReviewRequestViewRepository.create.mockResolvedValueOnce(undefined)

      // Act
      await ReviewRequestService.markAllReviewRequestsAsViewed(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>
      )

      // Assert
      expect(MockReviewRequestViewRepository.findAll).toHaveBeenCalled()
      expect(MockReviewRequestRepository.findAll).toHaveBeenCalled()
      expect(MockReviewRequestViewRepository.create).toHaveBeenCalledWith({
        reviewRequestId: MOCK_REVIEW_REQUEST_ONE.id,
        siteId: mockSiteOrmResponseWithAllCollaborators.id,
        userId: mockUserWithSiteSessionData.isomerUserId,
        lastViewedAt: null,
      })
    })

    it("should not mark any review request as viewed if they have already been viewed", async () => {
      // Arrange
      MockReviewRequestViewRepository.findAll.mockResolvedValueOnce([
        MOCK_REVIEW_REQUEST_VIEW_ONE,
      ])
      MockReviewRequestRepository.findAll.mockResolvedValueOnce([
        MOCK_REVIEW_REQUEST_ONE,
      ])
      MockReviewRequestViewRepository.create.mockResolvedValueOnce(undefined)

      // Act
      await ReviewRequestService.markAllReviewRequestsAsViewed(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>
      )

      // Assert
      expect(MockReviewRequestViewRepository.findAll).toHaveBeenCalled()
      expect(MockReviewRequestRepository.findAll).toHaveBeenCalled()
      expect(MockReviewRequestViewRepository.create).not.toHaveBeenCalled()
    })
  })

  describe("updateReviewRequestLastViewedAt", () => {
    it("should insert/update the review request view entry", async () => {
      // Arrange
      MockReviewRequestViewRepository.upsert.mockResolvedValueOnce(undefined)

      // Act
      await ReviewRequestService.updateReviewRequestLastViewedAt(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE
      )

      // Assert
      expect(MockReviewRequestViewRepository.upsert).toHaveBeenCalledWith({
        reviewRequestId: MOCK_REVIEW_REQUEST_ONE.id,
        siteId: mockSiteOrmResponseWithAllCollaborators.id,
        userId: mockUserWithSiteSessionData.isomerUserId,
        // NOTE: We can't use new Date() due to potential time lags
        lastViewedAt: expect.any(Date),
      })
    })
  })

  describe("markReviewRequestAsViewed", () => {
    it("should create a review request view entry if it does not already exist", async () => {
      // Arrange
      MockReviewRequestViewRepository.findOne.mockResolvedValueOnce(null)
      MockReviewRequestViewRepository.create.mockResolvedValueOnce(undefined)

      // Act
      await ReviewRequestService.markReviewRequestAsViewed(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.id
      )

      // Assert
      expect(MockReviewRequestViewRepository.findOne).toHaveBeenCalled()
      expect(MockReviewRequestViewRepository.create).toHaveBeenCalledWith({
        reviewRequestId: MOCK_REVIEW_REQUEST_ONE.id,
        siteId: mockSiteOrmResponseWithAllCollaborators.id,
        userId: mockUserWithSiteSessionData.isomerUserId,
        lastViewedAt: null,
      })
    })

    it("should not do anything if the review request view entry already exists", async () => {
      // Arrange
      MockReviewRequestViewRepository.findOne.mockResolvedValueOnce(
        MOCK_REVIEW_REQUEST_VIEW_ONE
      )

      // Act
      await ReviewRequestService.markReviewRequestAsViewed(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.id
      )

      // Assert
      expect(MockReviewRequestViewRepository.findOne).toHaveBeenCalled()
      expect(MockReviewRequestViewRepository.create).not.toHaveBeenCalled()
    })
  })

  describe("deleteAllReviewRequestViews", () => {
    it("should delete all existing review request view entries successfully", async () => {
      // Arrange
      MockReviewRequestRepository.findOne.mockResolvedValueOnce(
        MOCK_REVIEW_REQUEST_ONE
      )
      MockReviewRequestViewRepository.destroy.mockResolvedValueOnce(undefined)

      // Act
      await ReviewRequestService.deleteAllReviewRequestViews(
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.id
      )

      // Assert
      expect(SpyReviewRequestService.getReviewRequest).toHaveBeenCalledWith(
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.id
      )
      expect(MockReviewRequestRepository.findOne).toHaveBeenCalled()
      expect(MockReviewRequestViewRepository.destroy).toHaveBeenCalledWith({
        where: {
          reviewRequestId: MOCK_REVIEW_REQUEST_ONE.id,
          siteId: mockSiteOrmResponseWithAllCollaborators.id,
        },
      })
    })

    it("should return an error if the review request is not found", async () => {
      // Arrange
      MockReviewRequestRepository.findOne.mockResolvedValueOnce(
        new RequestNotFoundError()
      )

      // Act
      const actual = await ReviewRequestService.deleteAllReviewRequestViews(
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.id
      )

      // Assert
      expect(actual).toBeInstanceOf(RequestNotFoundError)
      expect(SpyReviewRequestService.getReviewRequest).toHaveBeenCalledWith(
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.id
      )
      expect(MockReviewRequestRepository.findOne).toHaveBeenCalled()
      expect(MockReviewRequestViewRepository.destroy).not.toHaveBeenCalled()
    })
  })

  describe("getReviewRequest", () => {
    it("should return the review request object if it exists", async () => {
      // Arrange
      MockReviewRequestRepository.findOne.mockResolvedValueOnce(
        MOCK_REVIEW_REQUEST_ONE
      )

      // Act
      const actual = await ReviewRequestService.getReviewRequest(
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.id
      )

      // Assert
      expect(actual).toEqual(MOCK_REVIEW_REQUEST_ONE)
      expect(MockReviewRequestRepository.findOne).toHaveBeenCalled()
    })

    it("should return an error if the review request is not found", async () => {
      // Arrange
      MockReviewRequestRepository.findOne.mockResolvedValueOnce(
        new RequestNotFoundError()
      )

      // Act
      const actual = await ReviewRequestService.getReviewRequest(
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.id
      )

      // Assert
      expect(actual).toBeInstanceOf(RequestNotFoundError)
      expect(MockReviewRequestRepository.findOne).toHaveBeenCalled()
    })
  })

  describe("getLatestMergedReviewRequest", () => {
    it("should return the review request object if it exists", async () => {
      // Arrange
      const mockMergedReviewRequest = _.set(
        _.clone(MOCK_REVIEW_REQUEST_ONE),
        "reviewStatus",
        ReviewRequestStatus.Merged
      )
      MockReviewRequestRepository.findOne.mockResolvedValueOnce(
        mockMergedReviewRequest
      )

      // Act
      const actual = await ReviewRequestService.getLatestMergedReviewRequest(
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>
      )

      // Assert
      expect(actual).toEqual(mockMergedReviewRequest)
      expect(MockReviewRequestRepository.findOne).toHaveBeenCalled()
    })

    it("should return an error if the review request is not found", async () => {
      // Arrange
      MockReviewRequestRepository.findOne.mockResolvedValueOnce(
        new RequestNotFoundError()
      )

      // Act
      const actual = await ReviewRequestService.getLatestMergedReviewRequest(
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>
      )

      // Assert
      expect(actual).toBeInstanceOf(RequestNotFoundError)
      expect(MockReviewRequestRepository.findOne).toHaveBeenCalled()
    })
  })

  describe("getFullReviewRequest", () => {
    it("should return the full review request object successfully", async () => {
      // Arrange
      const mockCommitDiff = {
        files: [],
        commits: [],
      }
      const expected = {
        reviewUrl: MOCK_REVIEW_REQUEST_ONE.reviewMeta.reviewLink,
        title: MOCK_PULL_REQUEST_ONE.title,
        status: MOCK_REVIEW_REQUEST_ONE.reviewStatus,
        requestor: MOCK_IDENTITY_EMAIL_ONE,
        reviewers: [MOCK_IDENTITY_EMAIL_TWO, MOCK_IDENTITY_EMAIL_THREE],
        reviewRequestedTime: new Date(
          MOCK_PULL_REQUEST_ONE.created_at
        ).getTime(),
        changedItems: [],
      }
      MockReviewRequestRepository.findOne.mockResolvedValueOnce(
        MOCK_REVIEW_REQUEST_ONE
      )
      MockReviewApi.getPullRequest.mockResolvedValueOnce(MOCK_PULL_REQUEST_ONE)
      MockReviewApi.getCommitDiff.mockResolvedValueOnce(mockCommitDiff)

      // Act
      const actual = await ReviewRequestService.getFullReviewRequest(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.id
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockReviewRequestRepository.findOne).toHaveBeenCalled()
      expect(MockReviewApi.getPullRequest).toHaveBeenCalled()
      expect(MockReviewApi.getCommitDiff).toHaveBeenCalled()
    })

    it("should return an error if the review request is not found", async () => {
      // Arrange
      MockReviewRequestRepository.findOne.mockResolvedValueOnce(null)

      // Act
      const actual = await ReviewRequestService.getFullReviewRequest(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.id
      )

      // Assert
      expect(actual).toBeInstanceOf(RequestNotFoundError)
      expect(MockReviewRequestRepository.findOne).toHaveBeenCalled()
      expect(MockReviewApi.getPullRequest).not.toHaveBeenCalled()
      expect(MockReviewApi.getCommitDiff).not.toHaveBeenCalled()
    })
  })

  describe("updateReviewRequest", () => {
    it("should update the review request with the reviewers successfully", async () => {
      // Arrange
      const mockReviewers = [mockCollaboratorAdmin1, mockCollaboratorAdmin2]

      // Act
      await ReviewRequestService.updateReviewRequest(
        MockReviewRequest as Attributes<ReviewRequest>,
        {
          reviewers: mockReviewers,
        }
      )

      // Assert
      expect(MockReviewRequest.$set).toHaveBeenCalledWith(
        "reviewers",
        mockReviewers
      )
      expect(MockReviewRequest.save).toHaveBeenCalled()
    })
  })

  describe("approveReviewRequest", () => {
    it("should update the status of the review request to approved successfully", async () => {
      // Arrange
      const mockReviewRequestOpen = _.clone(MockReviewRequest)

      // Act
      await ReviewRequestService.approveReviewRequest(mockReviewRequestOpen)

      // Assert
      expect(mockReviewRequestOpen.reviewStatus).toEqual(
        ReviewRequestStatus.Approved
      )
      expect(mockReviewRequestOpen.save).toHaveBeenCalled()
    })
  })

  describe("deleteReviewRequestApproval", () => {
    it("should delete the review request approval successfully", async () => {
      // Arrange
      const mockReviewRequestApproved = _.set(
        _.clone(MockReviewRequest),
        "reviewStatus",
        ReviewRequestStatus.Approved
      )

      // Act
      await ReviewRequestService.deleteReviewRequestApproval(
        mockReviewRequestApproved
      )

      // Assert
      expect(mockReviewRequestApproved.reviewStatus).toEqual(
        ReviewRequestStatus.Open
      )
      expect(mockReviewRequestApproved.save).toHaveBeenCalled()
    })
  })

  describe("closeReviewRequest", () => {
    it("should close the review request successfully", async () => {
      // Arrange
      const mockReviewRequestOpen = _.clone(MockReviewRequest)
      MockReviewApi.closeReviewRequest.mockResolvedValueOnce(undefined)

      // Act
      await ReviewRequestService.closeReviewRequest(mockReviewRequestOpen)

      // Assert
      expect(MockReviewApi.closeReviewRequest).toHaveBeenCalled()
      expect(mockReviewRequestOpen.reviewStatus).toEqual(
        ReviewRequestStatus.Closed
      )
      expect(mockReviewRequestOpen.save).toHaveBeenCalled()
    })
  })

  describe("mergeReviewRequest", () => {
    it("should merge the review request successfully", async () => {
      // Arrange
      const mockReviewRequestOpen = _.clone(MockReviewRequest)
      MockReviewApi.approvePullRequest.mockResolvedValueOnce(undefined)
      MockReviewApi.mergePullRequest.mockResolvedValueOnce(undefined)

      // Act
      await ReviewRequestService.mergeReviewRequest(mockReviewRequestOpen)

      // Assert
      // NOTE: The mockReviewRequestOpen is modified in-place, so we need to
      // check the attribute against the expected value
      expect(mockReviewRequestOpen.reviewStatus).toEqual(
        ReviewRequestStatus.Merged
      )
      expect(MockReviewApi.approvePullRequest).toHaveBeenCalled()
      expect(MockReviewApi.mergePullRequest).toHaveBeenCalled()
      expect(mockReviewRequestOpen.save).toHaveBeenCalled()
    })
  })

  describe("createComment", () => {
    it("should create a new comment successfully", async () => {
      // Arrange
      MockReviewApi.createComment.mockResolvedValueOnce(undefined)

      // Act
      await ReviewRequestService.createComment(
        mockUserWithSiteSessionData,
        MOCK_REVIEW_REQUEST_ONE.id,
        MOCK_GITHUB_COMMENT_ONE
      )

      // Assert
      expect(MockReviewApi.createComment).toHaveBeenCalledWith(
        mockUserWithSiteSessionData.siteName,
        MOCK_REVIEW_REQUEST_ONE.id,
        mockUserWithSiteSessionData.isomerUserId,
        MOCK_GITHUB_COMMENT_ONE
      )
    })
  })

  describe("getComments", () => {
    it("should return an array of valid comment objects", async () => {
      // Arrange
      const mockComments: GithubCommentData[] = [
        MOCK_GITHUB_COMMENT_DATA_ONE,
        MOCK_GITHUB_COMMENT_DATA_TWO,
      ]
      const expected = [
        {
          user: MOCK_GITHUB_EMAIL_ADDRESS_ONE,
          message: MOCK_GITHUB_COMMENT_ONE,
          createdAt: new Date(MOCK_GITHUB_DATE_ONE).getTime(),
          isRead: true,
        },
        {
          user: MOCK_GITHUB_EMAIL_ADDRESS_TWO,
          message: MOCK_GITHUB_COMMENT_TWO,
          createdAt: new Date(MOCK_GITHUB_DATE_TWO).getTime(),
          isRead: false,
        },
      ]
      MockReviewApi.getComments.mockResolvedValueOnce(mockComments)
      MockReviewRequestViewRepository.findOne.mockResolvedValueOnce(
        MOCK_REVIEW_REQUEST_VIEW_ONE
      )
      MockUsersRepository.findByPk.mockResolvedValueOnce(
        MOCK_GITHUB_COMMIT_AUTHOR_ONE
      )
      MockUsersRepository.findByPk.mockResolvedValueOnce(
        MOCK_GITHUB_COMMIT_AUTHOR_TWO
      )

      // Act
      const actual = await ReviewRequestService.getComments(
        mockUserWithSiteSessionData,
        mockSiteOrmResponseWithAllCollaborators as Attributes<Site>,
        MOCK_REVIEW_REQUEST_ONE.id
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(MockReviewApi.getComments).toHaveBeenCalledWith(
        mockUserWithSiteSessionData.siteName,
        MOCK_REVIEW_REQUEST_ONE.id
      )
      expect(MockReviewRequestViewRepository.findOne).toHaveBeenCalled()
      expect(SpyReviewRequestService.computeCommentData).toHaveBeenCalledWith(
        mockComments,
        MOCK_REVIEW_REQUEST_VIEW_ONE.lastViewedAt
      )
    })
  })
})
