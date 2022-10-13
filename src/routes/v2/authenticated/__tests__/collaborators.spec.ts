import express from "express"
import request from "supertest"

import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import { CollaboratorsRouter } from "@routes/v2/authenticated/collaborators"

import { generateRouter } from "@fixtures/app"
import { mockSiteName, mockIsomerUserId } from "@fixtures/sessionData"
import { NotFoundError } from "@root/errors/NotFoundError"
import { UnprocessableError } from "@root/errors/UnprocessableError"
import { AuthorizationMiddleware } from "@root/middleware/authorization"
import CollaboratorsService from "@root/services/identity/CollaboratorsService"

describe("Collaborator Router", () => {
  const MOCK_EMAIL = "mockemail"
  const MOCK_ACK_VALUE = true
  const mockCollaboratorsService = {
    create: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
    getRole: jest.fn(),
    getStatistics: jest.fn(),
  }
  const mockAuthorizationMiddleware = {
    verifySiteAdmin: jest.fn(),
    verifySiteMember: jest.fn(),
  }

  const collaboratorsRouter = new CollaboratorsRouter({
    collaboratorsService: (mockCollaboratorsService as unknown) as CollaboratorsService,
    authorizationMiddleware: (mockAuthorizationMiddleware as unknown) as AuthorizationMiddleware,
  })

  const subrouter = express()

  // We can use read route handler here because we don't need to lock the repo
  subrouter.get(
    `/:siteName/collaborators/role`,
    attachReadRouteHandlerWrapper(collaboratorsRouter.getCollaboratorRole)
  )
  subrouter.get(
    `/:siteName/collaborators/`,
    attachReadRouteHandlerWrapper(collaboratorsRouter.listCollaborators)
  )
  subrouter.post(
    `/:siteName/collaborators/`,
    attachReadRouteHandlerWrapper(collaboratorsRouter.createCollaborator)
  )
  subrouter.delete(
    `/:siteName/collaborators/:userId`,
    attachReadRouteHandlerWrapper(collaboratorsRouter.deleteCollaborator)
  )
  subrouter.get(
    `/:siteName/collaborators/statistics`,
    attachReadRouteHandlerWrapper(
      collaboratorsRouter.getCollaboratorsStatistics
    )
  )

  const app = generateRouter(subrouter)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("list collaborators", () => {
    it("should retrieve the list of collaborators for a site", async () => {
      // Arrange
      const mockCollaboratorsValue: never[] = []
      const mockCollaboratorsResponse = {
        collaborators: mockCollaboratorsValue,
      }
      mockCollaboratorsService.list.mockResolvedValue(mockCollaboratorsValue)

      // Act
      const resp = await request(app)
        .get(`/${mockSiteName}/collaborators/`)
        .expect(200)

      // Assert
      expect(resp.body).toStrictEqual(mockCollaboratorsResponse)
      expect(mockCollaboratorsService.list).toHaveBeenCalledWith(
        mockSiteName,
        mockIsomerUserId
      )
    })
  })

  describe("create collaborators", () => {
    it("should create a new collaborator", async () => {
      // Arrange
      const mockRequestBody = { email: MOCK_EMAIL, acknowledge: MOCK_ACK_VALUE }

      // Act
      await request(app)
        .post(`/${mockSiteName}/collaborators/`)
        .send(mockRequestBody)
        .expect(200)

      // Assert
      expect(mockCollaboratorsService.create).toHaveBeenCalledWith(
        mockSiteName,
        MOCK_EMAIL,
        MOCK_ACK_VALUE
      )
    })
  })

  describe("delete collaborator", () => {
    it("should delete collaborator successfully", async () => {
      // Arrange
      mockCollaboratorsService.delete.mockResolvedValue(1)

      // Act
      await request(app)
        .delete(`/${mockSiteName}/collaborators/${mockIsomerUserId}`)
        .expect(200)

      // Assert
      expect(mockCollaboratorsService.delete).toHaveBeenCalledWith(
        mockSiteName,
        mockIsomerUserId
      )
    })

    it("should not delete last admin collaborator", async () => {
      // Arrange
      mockCollaboratorsService.delete.mockResolvedValue(
        new UnprocessableError("")
      )

      // Act
      await request(app)
        .delete(`/${mockSiteName}/collaborators/${mockIsomerUserId}`)
        .expect(422)

      // Assert
      expect(mockCollaboratorsService.delete).toHaveBeenCalledWith(
        mockSiteName,
        mockIsomerUserId
      )
    })

    it("should not delete user if user is not a site collaborator", async () => {
      // Arrange
      mockCollaboratorsService.delete.mockResolvedValue(new NotFoundError(""))

      // Act
      await request(app)
        .delete(`/${mockSiteName}/collaborators/${mockIsomerUserId}`)
        .expect(404)

      // Assert
      expect(mockCollaboratorsService.delete).toHaveBeenCalledWith(
        mockSiteName,
        mockIsomerUserId
      )
    })
  })

  describe("get collaborator role", () => {
    it("should get collaborator role", async () => {
      // Arrange
      const MOCK_COLLABORATOR_ROLE_VALUE = "role"
      const mockGetCollaboratorRoleResponse = {
        role: MOCK_COLLABORATOR_ROLE_VALUE,
      }
      mockCollaboratorsService.getRole.mockResolvedValue(
        MOCK_COLLABORATOR_ROLE_VALUE
      )

      // Act
      const resp = await request(app)
        .get(`/${mockSiteName}/collaborators/role`)
        .expect(200)

      // Assert
      expect(resp.body).toStrictEqual(mockGetCollaboratorRoleResponse)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledWith(
        mockSiteName,
        mockIsomerUserId
      )
    })
  })

  describe("get collaborators statistics", () => {
    it("should get collaborators statistics", async () => {
      // Arrange
      const MOCK_COLLABORATORS_STATISTICS = {
        total: 1,
        inactive: 1,
      }
      mockCollaboratorsService.getStatistics.mockResolvedValue(
        MOCK_COLLABORATORS_STATISTICS
      )

      // Act
      const resp = await request(app)
        .get(`/${mockSiteName}/collaborators/statistics`)
        .expect(200)

      // Assert
      expect(resp.body).toStrictEqual(MOCK_COLLABORATORS_STATISTICS)
      expect(mockCollaboratorsService.getStatistics).toHaveBeenCalledWith(
        mockSiteName
      )
    })
  })
})
