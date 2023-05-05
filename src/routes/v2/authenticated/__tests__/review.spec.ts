import express from "express"
import { err, errAsync, ok, okAsync } from "neverthrow"
import request from "supertest"

import RequestNotFoundError from "@errors/RequestNotFoundError"

import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import { ReviewsRouter as _ReviewsRouter } from "@routes/v2/authenticated/review"

import { generateRouterForDefaultUserWithSite } from "@fixtures/app"
import { mockUserId } from "@fixtures/identity"
import { MOCK_USER_EMAIL_ONE, MOCK_USER_EMAIL_TWO } from "@fixtures/users"
import { CollaboratorRoles, ReviewRequestStatus } from "@root/constants"
import MissingSiteError from "@root/errors/MissingSiteError"
import { GitHubService } from "@root/services/db/GitHubService"
import CollaboratorsService from "@services/identity/CollaboratorsService"
import NotificationsService from "@services/identity/NotificationsService"
import SitesService from "@services/identity/SitesService"
import UsersService from "@services/identity/UsersService"
import ReviewRequestService from "@services/review/ReviewRequestService"

describe("Review Requests Router", () => {
  const mockGithubService = {
    getRepoInfo: jest.fn().mockResolvedValue(true),
  }
  const mockReviewRequestService = {
    approveReviewRequest: jest.fn(),
    closeReviewRequest: jest.fn(),
    compareDiff: jest.fn(),
    createComment: jest.fn(),
    createReviewRequest: jest.fn(),
    deleteAllReviewRequestViews: jest.fn(),
    deleteReviewRequestApproval: jest.fn(),
    getComments: jest.fn(),
    getFullReviewRequest: jest.fn(),
    getReviewRequest: jest.fn(),
    listReviewRequest: jest.fn(),
    markAllReviewRequestsAsViewed: jest.fn(),
    markReviewRequestAsViewed: jest.fn(),
    mergeReviewRequest: jest.fn(),
    updateReviewRequest: jest.fn(),
    updateReviewRequestLastViewedAt: jest.fn(),
  }

  const mockIdentityUsersService = {
    findByEmail: jest.fn(),
    getSiteMember: jest.fn(),
  }

  const mockSitesService = {
    getBySiteName: jest.fn().mockReturnValue(ok("site")),
    getStagingUrl: jest.fn().mockReturnValue(okAsync("")),
  }

  const mockCollaboratorsService = {
    getRole: jest.fn(),
    list: jest.fn(),
  }

  const mockNotificationsService = {
    create: jest.fn(),
  }

  const ReviewsRouter = new _ReviewsRouter(
    (mockReviewRequestService as unknown) as ReviewRequestService,
    (mockIdentityUsersService as unknown) as UsersService,
    (mockSitesService as unknown) as SitesService,
    (mockCollaboratorsService as unknown) as CollaboratorsService,
    (mockNotificationsService as unknown) as NotificationsService,
    (mockGithubService as unknown) as GitHubService
  )

  const subrouter = express()
  // We can use read route handler here because we don't need to lock the repo
  subrouter.get(
    "/:siteName/review/compare",
    attachReadRouteHandlerWrapper(ReviewsRouter.compareDiff)
  )
  subrouter.post(
    "/:siteName/review/request",
    attachReadRouteHandlerWrapper(ReviewsRouter.createReviewRequest)
  )
  subrouter.get(
    "/:siteName/review/summary",
    attachReadRouteHandlerWrapper(ReviewsRouter.listReviews)
  )
  subrouter.post(
    "/:siteName/review/viewed",
    attachReadRouteHandlerWrapper(ReviewsRouter.markAllReviewRequestsAsViewed)
  )
  subrouter.get(
    "/:siteName/review/:requestId",
    attachReadRouteHandlerWrapper(ReviewsRouter.getReviewRequest)
  )
  subrouter.post(
    "/:siteName/review/:requestId/viewed",
    attachReadRouteHandlerWrapper(ReviewsRouter.markReviewRequestAsViewed)
  )
  subrouter.post(
    "/:siteName/review/:requestId/merge",
    attachReadRouteHandlerWrapper(ReviewsRouter.mergeReviewRequest)
  )
  subrouter.post(
    "/:siteName/review/:requestId/approve",
    attachReadRouteHandlerWrapper(ReviewsRouter.approveReviewRequest)
  )
  subrouter.get(
    "/:siteName/review/:requestId/comments",
    attachReadRouteHandlerWrapper(ReviewsRouter.getComments)
  )
  subrouter.post(
    "/:siteName/review/:requestId/comments",
    attachReadRouteHandlerWrapper(ReviewsRouter.createComment)
  )
  subrouter.delete(
    "/:siteName/review/:requestId/approve",
    attachReadRouteHandlerWrapper(ReviewsRouter.deleteReviewRequestApproval)
  )
  subrouter.post(
    "/:siteName/review/:requestId/comments/viewedComments",
    attachReadRouteHandlerWrapper(
      ReviewsRouter.markReviewRequestCommentsAsViewed
    )
  )
  subrouter.post(
    "/:siteName/review/:requestId",
    attachReadRouteHandlerWrapper(ReviewsRouter.updateReviewRequest)
  )
  subrouter.delete(
    "/:siteName/review/:requestId",
    attachReadRouteHandlerWrapper(ReviewsRouter.closeReviewRequest)
  )

  const app = generateRouterForDefaultUserWithSite(subrouter)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("compareDiff", () => {
    beforeEach(() => {
      // TODO (IS-58): Skip preconditions check for unmigrated site
      // Remove this when sites are fully migrated over to email login
      mockCollaboratorsService.list.mockResolvedValueOnce([{}])
    })
    it("should return 200 with the list of changed files", async () => {
      // Arrange
      const mockFilesChanged = ["file1", "file2"]
      mockIdentityUsersService.getSiteMember.mockResolvedValueOnce("user")
      mockReviewRequestService.compareDiff.mockResolvedValueOnce(
        mockFilesChanged
      )
      mockSitesService.getBySiteName.mockResolvedValueOnce(ok(true))

      // Act
      const response = await request(app).get("/mockSite/review/compare")

      // Assert
      expect(response.status).toEqual(200)
      expect(response.body).toEqual({ items: mockFilesChanged })
      expect(mockIdentityUsersService.getSiteMember).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.compareDiff).toHaveBeenCalledTimes(1)
    })

    it("should return 404 if user is not a site member", async () => {
      // Arrange
      mockIdentityUsersService.getSiteMember.mockResolvedValueOnce(null)
      mockSitesService.getBySiteName.mockResolvedValueOnce(ok(true))

      // Act
      const response = await request(app).get("/mockSite/review/compare")

      // Assert
      expect(response.status).toEqual(404)
      expect(mockIdentityUsersService.getSiteMember).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.compareDiff).not.toHaveBeenCalled()
    })
  })

  describe("createReviewRequest", () => {
    it("should return 200 with the pull request number of the created review request", async () => {
      // Arrange
      const mockPullRequestNumber = 1
      const mockReviewer = "reviewer@test.gov.sg"
      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockIdentityUsersService.findByEmail.mockResolvedValueOnce("user")
      mockCollaboratorsService.list.mockResolvedValueOnce([
        {
          email: mockReviewer,
          SiteMember: {
            role: CollaboratorRoles.Admin,
          },
          id: mockUserId,
        },
      ])
      mockReviewRequestService.createReviewRequest.mockResolvedValueOnce(
        mockPullRequestNumber
      )
      mockNotificationsService.create.mockResolvedValueOnce([])

      // Act
      const response = await request(app)
        .post("/mockSite/review/request")
        .send({
          reviewers: [mockReviewer],
          title: "mockTitle",
          description: "mockDescription",
        })

      // Assert
      expect(response.status).toEqual(200)
      expect(response.body).toEqual({
        pullRequestNumber: mockPullRequestNumber,
      })
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockIdentityUsersService.findByEmail).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.list).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.createReviewRequest
      ).toHaveBeenCalledTimes(1)
      expect(mockNotificationsService.create).toHaveBeenCalledTimes(1)
    })

    it("should return 404 if the site does not exist", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockReturnValueOnce(
        err(new MissingSiteError("site"))
      )

      // Act
      const response = await request(app)
        .post("/mockSite/review/request")
        .send({})

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).not.toHaveBeenCalled()
      expect(mockIdentityUsersService.findByEmail).not.toHaveBeenCalled()
      expect(mockCollaboratorsService.list).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.createReviewRequest
      ).not.toHaveBeenCalled()
      expect(mockNotificationsService.create).not.toHaveBeenCalled()
    })

    it("should return 404 if user is not a site collaborator", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce(null)

      // Act
      const response = await request(app)
        .post("/mockSite/review/request")
        .send({})

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockIdentityUsersService.findByEmail).not.toHaveBeenCalled()
      expect(mockCollaboratorsService.list).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.createReviewRequest
      ).not.toHaveBeenCalled()
      expect(mockNotificationsService.create).not.toHaveBeenCalled()
    })

    it("should return 400 if no reviewers are provided", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockIdentityUsersService.findByEmail.mockResolvedValueOnce("user")

      // Act
      const response = await request(app)
        .post("/mockSite/review/request")
        .send({
          reviewers: [],
          title: "mockTitle",
          description: "mockDescription",
        })

      // Assert
      expect(response.status).toEqual(400)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockIdentityUsersService.findByEmail).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.list).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.createReviewRequest
      ).not.toHaveBeenCalled()
      expect(mockNotificationsService.create).not.toHaveBeenCalled()
    })

    it("should return 400 if provided reviewer is not an admin", async () => {
      // Arrange
      const mockReviewer = "reviewer@test.gov.sg"

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockIdentityUsersService.findByEmail.mockResolvedValueOnce("user")
      mockCollaboratorsService.list.mockResolvedValueOnce([])

      // Act
      const response = await request(app)
        .post("/mockSite/review/request")
        .send({
          reviewers: [mockReviewer],
          title: "mockTitle",
          description: "mockDescription",
        })

      // Assert
      expect(response.status).toEqual(400)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockIdentityUsersService.findByEmail).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.list).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.createReviewRequest
      ).not.toHaveBeenCalled()
      expect(mockNotificationsService.create).not.toHaveBeenCalled()
    })
  })

  describe("listReviews", () => {
    beforeEach(() => {
      // TODO (IS-58): Skip preconditions check for unmigrated site
      // Remove this when sites are fully migrated over to email login
      mockCollaboratorsService.list.mockResolvedValueOnce([{}])
    })
    it("should return 200 with the list of reviews", async () => {
      // Arrange
      const mockReviews = ["review1", "review2"]

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockReviewRequestService.listReviewRequest.mockResolvedValueOnce(
        mockReviews
      )

      // Act
      const response = await request(app).get("/mockSite/review/summary")

      // Assert
      expect(response.status).toEqual(200)
      expect(response.body).toEqual({ reviews: mockReviews })
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.listReviewRequest).toHaveBeenCalledTimes(
        1
      )
    })

    it("should return 404 if the site does not exist", async () => {
      // Arrange
      mockGithubService.getRepoInfo.mockRejectedValueOnce(false)
      mockIdentityUsersService.getSiteMember.mockResolvedValueOnce({})
      mockSitesService.getBySiteName.mockReturnValueOnce(
        err(new MissingSiteError("site"))
      )

      // Act
      const response = await request(app).get("/mockSite/review/summary")

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).not.toHaveBeenCalled()
      expect(mockReviewRequestService.listReviewRequest).not.toHaveBeenCalled()
    })

    it("should return 404 if user is not a site collaborator", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce(null)

      // Act
      const response = await request(app).get("/mockSite/review/summary")

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.listReviewRequest).not.toHaveBeenCalled()
    })
  })

  describe("markAllReviewRequestsAsViewed", () => {
    it("should return 200 and mark all review requests as viewed", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")

      // Act
      const response = await request(app).post("/mockSite/review/viewed")

      // Assert
      expect(response.status).toEqual(200)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.markAllReviewRequestsAsViewed
      ).toHaveBeenCalledTimes(1)
    })

    it("should return 404 if the site does not exist", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockReturnValueOnce(
        err(new MissingSiteError("site"))
      )

      // Act
      const response = await request(app).post("/mockSite/review/viewed")

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.markAllReviewRequestsAsViewed
      ).not.toHaveBeenCalled()
    })

    it("should return 404 if user is not a site collaborator", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce(null)

      // Act
      const response = await request(app).post("/mockSite/review/viewed")

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.markAllReviewRequestsAsViewed
      ).not.toHaveBeenCalled()
    })
  })

  describe("markReviewRequestAsViewed", () => {
    it("should return 200 and mark review request as viewed", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce({
        id: 12345,
      })

      // Act
      const response = await request(app).post(`/mockSite/review/12345/viewed`)

      // Assert
      expect(response.status).toEqual(200)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.markReviewRequestAsViewed
      ).toHaveBeenCalledTimes(1)
    })

    it("should return 404 if the site does not exist", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockReturnValueOnce(
        err(new MissingSiteError("site"))
      )

      // Act
      const response = await request(app).post(`/mockSite/review/12345/viewed`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).not.toHaveBeenCalled()
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.markReviewRequestAsViewed
      ).not.toHaveBeenCalled()
    })

    it("should return 404 if user is not a site collaborator", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce(null)

      // Act
      const response = await request(app).post(`/mockSite/review/12345/viewed`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.markReviewRequestAsViewed
      ).not.toHaveBeenCalled()
    })

    it("should return 404 if review request does not exist", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        new RequestNotFoundError()
      )

      // Act
      const response = await request(app).post(`/mockSite/review/12345/viewed`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.markReviewRequestAsViewed
      ).not.toHaveBeenCalled()
    })
  })

  describe("getReviewRequest", () => {
    beforeEach(() => {
      // TODO (IS-58): Skip preconditions check for unmigrated site
      // Remove this when sites are fully migrated over to email login
      mockCollaboratorsService.list.mockResolvedValueOnce([{}])
    })

    it("should return 200 with the full review request", async () => {
      // Arrange
      const mockReviewRequest = "review request"
      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockReviewRequestService.getFullReviewRequest.mockReturnValueOnce(
        okAsync(mockReviewRequest)
      )

      // Act
      const response = await request(app).get(`/mockSite/review/12345`)

      // Assert
      expect(response.status).toEqual(200)
      expect(response.body).toEqual({ reviewRequest: mockReviewRequest })
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.getFullReviewRequest
      ).toHaveBeenCalledTimes(1)
    })

    it("should return 404 if the site does not exist", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockReturnValueOnce(
        errAsync(new MissingSiteError("site"))
      )
      mockGithubService.getRepoInfo.mockRejectedValueOnce(null)

      // Act
      const response = await request(app).get(`/mockSite/review/12345`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.getFullReviewRequest
      ).not.toHaveBeenCalled()
    })

    it("should return 404 if user is not a site collaborator", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce(null)

      // Act
      const response = await request(app).get(`/mockSite/review/12345`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.getFullReviewRequest
      ).not.toHaveBeenCalled()
    })

    it("should return 404 if review request does not exist", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockReviewRequestService.getFullReviewRequest.mockReturnValueOnce(
        errAsync(new RequestNotFoundError())
      )

      // Act
      const response = await request(app).get(`/mockSite/review/12345`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.getFullReviewRequest
      ).toHaveBeenCalledTimes(1)
    })
  })

  describe("updateReviewRequest", () => {
    it("should return 200 with the updated review request", async () => {
      // Arrange
      const mockReviewRequest = { requestor: { email: MOCK_USER_EMAIL_ONE } }
      const mockReviewer = "reviewer@test.gov.sg"

      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        mockReviewRequest
      )
      mockCollaboratorsService.list.mockResolvedValueOnce([
        {
          email: mockReviewer,
          SiteMember: {
            role: CollaboratorRoles.Admin,
          },
          id: mockUserId,
        },
      ])
      mockReviewRequestService.updateReviewRequest.mockResolvedValueOnce(
        mockReviewRequest
      )

      // Act
      const response = await request(app)
        .post(`/mockSite/review/12345`)
        .send({
          reviewers: [mockReviewer],
        })

      // Assert
      expect(response.status).toEqual(200)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.list).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.updateReviewRequest
      ).toHaveBeenCalledTimes(1)
    })

    it("should return 404 if the site does not exist", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockReturnValueOnce(
        err(new MissingSiteError("site"))
      )

      // Act
      const response = await request(app).post(`/mockSite/review/12345`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(mockCollaboratorsService.list).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.updateReviewRequest
      ).not.toHaveBeenCalled()
    })

    it("should return 404 if the review request is not found", async () => {
      // Arrange

      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        new RequestNotFoundError()
      )

      // Act
      const response = await request(app).post(`/mockSite/review/12345`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.list).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.updateReviewRequest
      ).not.toHaveBeenCalled()
    })

    it("should return 403 if user is not the original requestor", async () => {
      // Arrange
      const mockReviewRequest = { requestor: { email: "other@test.gov.sg" } }

      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        mockReviewRequest
      )

      // Act
      const response = await request(app).post(`/mockSite/review/12345`)

      // Assert
      expect(response.status).toEqual(403)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.list).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.updateReviewRequest
      ).not.toHaveBeenCalled()
    })

    it("should return 400 if the given reviewers are not admins of the site", async () => {
      // Arrange
      const mockReviewRequest = { requestor: { email: MOCK_USER_EMAIL_ONE } }

      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        mockReviewRequest
      )
      mockCollaboratorsService.list.mockResolvedValueOnce([])

      // Act
      const response = await request(app)
        .post(`/mockSite/review/12345`)
        .send({
          reviewers: [MOCK_USER_EMAIL_TWO],
        })

      // Assert
      expect(response.status).toEqual(400)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.list).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.updateReviewRequest
      ).not.toHaveBeenCalled()
    })
  })

  describe("mergeReviewRequest", () => {
    it("should return 200 with the review request successfully merged", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce({
        reviewStatus: ReviewRequestStatus.Approved,
      })
      mockReviewRequestService.mergeReviewRequest.mockResolvedValueOnce(
        undefined
      )
      mockReviewRequestService.deleteAllReviewRequestViews.mockResolvedValueOnce(
        undefined
      )

      // Act
      const response = await request(app).post(`/mockSite/review/12345/merge`)

      // Assert
      expect(response.status).toEqual(200)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.mergeReviewRequest).toHaveBeenCalledTimes(
        1
      )
      expect(
        mockReviewRequestService.deleteAllReviewRequestViews
      ).toHaveBeenCalledTimes(1)
    })

    it("should return 404 if the site does not exist", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockReturnValueOnce(
        err(new MissingSiteError("site"))
      )

      // Act
      const response = await request(app).post(`/mockSite/review/12345/merge`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).not.toHaveBeenCalled()
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(mockReviewRequestService.mergeReviewRequest).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.deleteAllReviewRequestViews
      ).not.toHaveBeenCalled()
    })

    it("should return 404 if user is not a site member", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce(null)

      // Act
      const response = await request(app).post(`/mockSite/review/12345/merge`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(mockReviewRequestService.mergeReviewRequest).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.deleteAllReviewRequestViews
      ).not.toHaveBeenCalled()
    })

    it("should return 404 if the review request does not exist", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        new RequestNotFoundError()
      )

      // Act
      const response = await request(app).post(`/mockSite/review/12345/merge`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.mergeReviewRequest).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.deleteAllReviewRequestViews
      ).not.toHaveBeenCalled()
    })
  })

  describe("approveReviewRequest", () => {
    it("should return 200 with the review request successfully marked as approved", async () => {
      // Arrange
      const mockReviewRequest = {
        reviewers: [{ email: MOCK_USER_EMAIL_ONE }],
        reviewStatus: ReviewRequestStatus.Open,
        requestor: MOCK_USER_EMAIL_TWO,
      }
      const mockReviewer = "reviewer@test.gov.sg"

      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        mockReviewRequest
      )
      mockReviewRequestService.approveReviewRequest.mockResolvedValueOnce(
        undefined
      )
      mockCollaboratorsService.list.mockResolvedValueOnce([
        {
          email: mockReviewer,
          SiteMember: {
            role: CollaboratorRoles.Admin,
          },
          id: mockUserId,
        },
      ])

      // Act
      const response = await request(app).post(`/mockSite/review/12345/approve`)

      // Assert
      expect(response.status).toEqual(200)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.approveReviewRequest
      ).toHaveBeenCalledTimes(1)
      expect(mockNotificationsService.create).toHaveBeenCalledTimes(1)
    })

    it("should return 404 if the site does not exist", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockReturnValueOnce(
        err(new MissingSiteError("site"))
      )

      // Act
      const response = await request(app).post(`/mockSite/review/12345/approve`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.approveReviewRequest
      ).not.toHaveBeenCalled()
      expect(mockNotificationsService.create).not.toHaveBeenCalled()
    })

    it("should return 404 if the review request does not exist", async () => {
      // Arrange

      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        new RequestNotFoundError()
      )

      // Act
      const response = await request(app).post(`/mockSite/review/12345/approve`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.approveReviewRequest
      ).not.toHaveBeenCalled()
      expect(mockNotificationsService.create).not.toHaveBeenCalled()
    })

    it("should return 403 if the user is not a reviewer", async () => {
      // Arrange
      const mockReviewRequest = {
        reviewers: [{ email: "other@test.gov.sg" }],
        reviewStatus: ReviewRequestStatus.Open,
        requestor: MOCK_USER_EMAIL_TWO,
      }

      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        mockReviewRequest
      )

      // Act
      const response = await request(app).post(`/mockSite/review/12345/approve`)

      // Assert
      expect(response.status).toEqual(403)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.approveReviewRequest
      ).not.toHaveBeenCalled()
      expect(mockNotificationsService.create).not.toHaveBeenCalled()
    })
  })

  describe("getComments", () => {
    beforeEach(() => {
      // TODO (IS-58): Skip preconditions check for unmigrated site
      // Remove this when sites are fully migrated over to email login
      mockCollaboratorsService.list.mockResolvedValueOnce([{}])
    })
    it("should return 200 with the comments for a review request", async () => {
      // Arrange
      const mockComments = ["comment1", "comment2"]

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        "review request"
      )
      mockReviewRequestService.getComments.mockResolvedValueOnce(mockComments)

      // Act
      const response = await request(app).get(`/mockSite/review/12345/comments`)

      // Assert
      expect(response.status).toEqual(200)
      expect(response.body).toEqual(mockComments)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getComments).toHaveBeenCalledTimes(1)
    })

    it("should return 404 if the site does not exist", async () => {
      // Arrange
      mockGithubService.getRepoInfo.mockRejectedValueOnce(false)
      mockSitesService.getBySiteName.mockReturnValueOnce(
        err(new MissingSiteError("site"))
      )

      // Act
      const response = await request(app).get(`/mockSite/review/12345/comments`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).not.toHaveBeenCalled()
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(mockReviewRequestService.getComments).not.toHaveBeenCalled()
    })

    it("should return 404 if user is not a valid site member", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce(null)

      // Act
      const response = await request(app).get(`/mockSite/review/12345/comments`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(mockReviewRequestService.getComments).not.toHaveBeenCalled()
    })

    it("should return 404 if the review request does not exist", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        new RequestNotFoundError()
      )

      // Act
      const response = await request(app).get(`/mockSite/review/12345/comments`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getComments).not.toHaveBeenCalled()
    })
  })

  describe("createComment", () => {
    it("should return 200 with the comment created successfully", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        "review request"
      )
      mockReviewRequestService.createComment.mockResolvedValueOnce(undefined)

      // Act
      const response = await request(app)
        .post(`/mockSite/review/12345/comments`)
        .send({ message: "comment" })

      // Assert
      expect(response.status).toEqual(200)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.createComment).toHaveBeenCalledTimes(1)
    })

    it("should return 404 if the site does not exist", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockReturnValueOnce(
        err(new MissingSiteError("site"))
      )

      // Act
      const response = await request(app)
        .post(`/mockSite/review/12345/comments`)
        .send({ message: "comment" })

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).not.toHaveBeenCalled()
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(mockReviewRequestService.createComment).not.toHaveBeenCalled()
    })

    it("should return 404 if user is not a valid site member", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce(null)

      // Act
      const response = await request(app)
        .post(`/mockSite/review/12345/comments`)
        .send({ message: "comment" })

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(mockReviewRequestService.createComment).not.toHaveBeenCalled()
    })

    it("should return 404 if the review request does not exist", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        new RequestNotFoundError()
      )

      // Act
      const response = await request(app)
        .post(`/mockSite/review/12345/comments`)
        .send({ message: "comment" })

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.createComment).not.toHaveBeenCalled()
    })
  })

  describe("markReviewRequestCommentsAsViewed", () => {
    it("should return 200 with the lastViewedAt timestamp updated successfully", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        "review request"
      )
      mockReviewRequestService.updateReviewRequestLastViewedAt.mockResolvedValueOnce(
        undefined
      )

      // Act
      const response = await request(app).post(
        `/mockSite/review/12345/comments/viewedComments`
      )

      // Assert
      expect(response.status).toEqual(200)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.updateReviewRequestLastViewedAt
      ).toHaveBeenCalledTimes(1)
    })

    it("should return 404 if the site does not exist", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockReturnValueOnce(
        err(new MissingSiteError("site"))
      )

      // Act
      const response = await request(app).post(
        `/mockSite/review/12345/comments/viewedComments`
      )

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).not.toHaveBeenCalled()
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.updateReviewRequestLastViewedAt
      ).not.toHaveBeenCalled()
    })

    it("should return 404 if user is not a valid site member", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce(null)

      // Act
      const response = await request(app).post(
        `/mockSite/review/12345/comments/viewedComments`
      )

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.updateReviewRequestLastViewedAt
      ).not.toHaveBeenCalled()
    })

    it("should return 404 if the review request does not exist", async () => {
      // Arrange

      mockCollaboratorsService.getRole.mockResolvedValueOnce("role")
      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        new RequestNotFoundError()
      )

      // Act
      const response = await request(app).post(
        `/mockSite/review/12345/comments/viewedComments`
      )

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.updateReviewRequestLastViewedAt
      ).not.toHaveBeenCalled()
    })
  })

  describe("closeReviewRequest", () => {
    it("should return 200 with the review request closed successfully", async () => {
      // Arrange
      const mockReviewRequest = { requestor: { email: MOCK_USER_EMAIL_ONE } }
      const mockReviewer = "reviewer@test.gov.sg"

      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        mockReviewRequest
      )
      mockReviewRequestService.closeReviewRequest.mockResolvedValueOnce(
        undefined
      )
      mockReviewRequestService.deleteAllReviewRequestViews.mockResolvedValueOnce(
        undefined
      )
      mockCollaboratorsService.list.mockResolvedValueOnce([
        {
          email: mockReviewer,
          SiteMember: {
            role: CollaboratorRoles.Admin,
          },
          id: mockUserId,
        },
      ])

      // Act
      const response = await request(app).delete(`/mockSite/review/12345`)

      // Assert
      expect(response.status).toEqual(200)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.closeReviewRequest).toHaveBeenCalledTimes(
        1
      )
      expect(
        mockReviewRequestService.deleteAllReviewRequestViews
      ).toHaveBeenCalledTimes(1)
      expect(mockNotificationsService.create).toHaveBeenCalledTimes(1)
    })

    it("should return 404 if the site does not exist", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockReturnValueOnce(
        err(new MissingSiteError("site"))
      )

      // Act
      const response = await request(app).delete(`/mockSite/review/12345`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(mockReviewRequestService.closeReviewRequest).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.deleteAllReviewRequestViews
      ).not.toHaveBeenCalled()
      expect(mockNotificationsService.create).not.toHaveBeenCalled()
    })

    it("should return 404 if the review request does not exist", async () => {
      // Arrange

      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        new RequestNotFoundError()
      )

      // Act
      const response = await request(app).delete(`/mockSite/review/12345`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.closeReviewRequest).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.deleteAllReviewRequestViews
      ).not.toHaveBeenCalled()
      expect(mockNotificationsService.create).not.toHaveBeenCalled()
    })

    it("should return 404 if the user is not the requestor of the review request", async () => {
      // Arrange
      const mockReviewRequest = { requestor: { email: "other@test.gov.sg" } }

      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        mockReviewRequest
      )

      // Act
      const response = await request(app).delete(`/mockSite/review/12345`)

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.closeReviewRequest).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.deleteAllReviewRequestViews
      ).not.toHaveBeenCalled()
      expect(mockNotificationsService.create).not.toHaveBeenCalled()
    })
  })

  describe("deleteReviewRequestApproval", () => {
    it("should return 200 with the review request approval deleted successfully", async () => {
      // Arrange
      const mockReviewRequest = { reviewers: [{ email: MOCK_USER_EMAIL_ONE }] }

      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        mockReviewRequest
      )
      mockReviewRequestService.deleteReviewRequestApproval.mockResolvedValueOnce(
        undefined
      )

      // Act
      const response = await request(app).delete(
        `/mockSite/review/12345/approve`
      )

      // Assert
      expect(response.status).toEqual(200)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.deleteReviewRequestApproval
      ).toHaveBeenCalledTimes(1)
    })

    it("should return 404 if the site does not exist", async () => {
      // Arrange
      mockSitesService.getBySiteName.mockReturnValueOnce(
        err(new MissingSiteError("site"))
      )

      // Act
      const response = await request(app).delete(
        `/mockSite/review/12345/approve`
      )

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).not.toHaveBeenCalled()
      expect(
        mockReviewRequestService.deleteReviewRequestApproval
      ).not.toHaveBeenCalled()
    })

    it("should return 404 if the review request does not exist", async () => {
      // Arrange

      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        new RequestNotFoundError()
      )

      // Act
      const response = await request(app).delete(
        `/mockSite/review/12345/approve`
      )

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.deleteReviewRequestApproval
      ).not.toHaveBeenCalled()
    })

    it("should return 404 if the user is not a reviewer of the review request", async () => {
      // Arrange
      const mockReviewRequest = { reviewers: [{ email: "other@test.gov.sg" }] }

      mockReviewRequestService.getReviewRequest.mockResolvedValueOnce(
        mockReviewRequest
      )

      // Act
      const response = await request(app).delete(
        `/mockSite/review/12345/approve`
      )

      // Assert
      expect(response.status).toEqual(404)
      expect(mockSitesService.getBySiteName).toHaveBeenCalledTimes(1)
      expect(mockReviewRequestService.getReviewRequest).toHaveBeenCalledTimes(1)
      expect(
        mockReviewRequestService.deleteReviewRequestApproval
      ).not.toHaveBeenCalled()
    })
  })
})
