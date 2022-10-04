import { ModelStatic } from "sequelize"

import { ForbiddenError } from "@errors/ForbiddenError"
import { NotFoundError } from "@errors/NotFoundError"
import { UnprocessableError } from "@errors/UnprocessableError"

import { Site, SiteMember, Whitelist } from "@database/models"
import {
  expectedSortedMockCollaboratorsList,
  mockSiteOrmResponseWithAllCollaborators,
  mockSiteOrmResponseWithOneAdminCollaborator,
  mockSiteOrmResponseWithOneContributorCollaborator,
  mockSiteOrmResponseWithNoCollaborators,
} from "@fixtures/identity"
import { CollaboratorRoles } from "@root/constants"
import { BadRequestError } from "@root/errors/BadRequestError"
import { ConflictError } from "@root/errors/ConflictError"
import CollaboratorsService from "@services/identity/CollaboratorsService"
import SitesService from "@services/identity/SitesService"
import UsersService from "@services/identity/UsersService"

describe("CollaboratorsService", () => {
  const mockSiteName = "sitename"
  const mockEmailAddress = "test1@test.gov.sg"
  const mockSiteId = 1
  const mockUserId = "2"
  const mockWhitelistId = 3
  const mockSiteRepo = {
    findOne: jest.fn(),
  }
  const mockSiteMemberRepo = {
    destroy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  }
  const mockWhitelistRepo = {
    findAll: jest.fn(),
  }

  const mockSitesService = {
    getBySiteName: jest.fn(),
  }
  const mockUsersService = {
    findByEmail: jest.fn(),
  }

  const collaboratorsService = new CollaboratorsService({
    siteRepository: (mockSiteRepo as unknown) as ModelStatic<Site>,
    siteMemberRepository: (mockSiteMemberRepo as unknown) as ModelStatic<SiteMember>,
    sitesService: (mockSitesService as unknown) as SitesService,
    usersService: (mockUsersService as unknown) as UsersService,
    whitelist: (mockWhitelistRepo as unknown) as ModelStatic<Whitelist>,
  })

  // Prevent inter-test pollution of mocks
  afterEach(() => jest.clearAllMocks())

  describe("deriveAllowedRoleFromEmail", () => {
    it("should derive admin role for valid admin-eligible emails", async () => {
      // Arrange
      const mockWhitelistEntries = [
        {
          id: mockWhitelistId,
          email: mockEmailAddress,
          expiry: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      mockWhitelistRepo.findAll.mockResolvedValue(
        (mockWhitelistEntries as unknown) as Whitelist[]
      )

      // Act
      const role = await collaboratorsService.deriveAllowedRoleFromEmail(
        mockEmailAddress
      )

      // Assert
      expect(role).toStrictEqual(CollaboratorRoles.Admin)
      expect(mockWhitelistRepo.findAll).toHaveBeenCalled()
    })

    it("should derive contributor role for valid contributor-eligible emails", async () => {
      // Arrange
      const mockWhitelistEntries = [
        {
          id: mockWhitelistId,
          email: mockEmailAddress,
          expiry: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      mockWhitelistRepo.findAll.mockResolvedValue(
        (mockWhitelistEntries as unknown) as Whitelist[]
      )

      // Act
      const role = await collaboratorsService.deriveAllowedRoleFromEmail(
        mockEmailAddress
      )

      // Assert
      expect(role).toStrictEqual(CollaboratorRoles.Contributor)
      expect(mockWhitelistRepo.findAll).toHaveBeenCalled()
    })

    it("should derive no role for emails from non-whitelisted domains", async () => {
      // Arrange
      const mockWhitelistEntries: never[] = []
      mockWhitelistRepo.findAll.mockResolvedValue(
        mockWhitelistEntries as Whitelist[]
      )

      // Act
      const role = await collaboratorsService.deriveAllowedRoleFromEmail(
        mockEmailAddress
      )

      // Assert
      expect(role).toStrictEqual(null)
      expect(mockWhitelistRepo.findAll).toHaveBeenCalled()
    })
  })

  describe("list", () => {
    it("should list all collaborators in the correct sequence", async () => {
      // Arrange
      mockSiteRepo.findOne.mockResolvedValue(
        mockSiteOrmResponseWithAllCollaborators
      )

      // Act
      const collaborators = await collaboratorsService.list(
        mockSiteName,
        mockEmailAddress
      )

      // Assert
      expect(mockSiteRepo.findOne).toHaveBeenCalled()
      expect(collaborators).toStrictEqual(expectedSortedMockCollaboratorsList)
    })

    it("should return empty array if no collaborators are found", async () => {
      // Arrange
      mockSiteRepo.findOne.mockResolvedValue(
        mockSiteOrmResponseWithNoCollaborators
      )

      // Act
      const collaborators = await collaboratorsService.list(mockSiteName)

      // Assert
      expect(mockSiteRepo.findOne).toHaveBeenCalled()
      expect(collaborators).toStrictEqual([])
    })

    it("should return empty array if no site with the specified id is found", async () => {
      // Arrange
      mockSiteRepo.findOne.mockResolvedValue([])

      // Act
      const collaborators = await collaboratorsService.list(mockSiteName)

      // Assert
      expect(mockSiteRepo.findOne).toHaveBeenCalled()
      expect(collaborators).toStrictEqual([])
    })
  })

  describe("getRole", () => {
    it("should retrieve correct admin role", async () => {
      // Arrange
      mockSiteRepo.findOne.mockResolvedValue(
        mockSiteOrmResponseWithOneAdminCollaborator
      )

      // Act
      const role = await collaboratorsService.getRole(mockSiteName, mockUserId)

      // Assert
      expect(mockSiteRepo.findOne).toHaveBeenCalled()
      expect(role).toStrictEqual(CollaboratorRoles.Admin)
    })

    it("should retrieve correct contributor role", async () => {
      // Arrange
      mockSiteRepo.findOne.mockResolvedValue(
        mockSiteOrmResponseWithOneContributorCollaborator
      )

      // Act
      const role = await collaboratorsService.getRole(mockSiteName, mockUserId)

      // Assert
      expect(mockSiteRepo.findOne).toHaveBeenCalled()
      expect(role).toStrictEqual(CollaboratorRoles.Contributor)
    })

    it("should retrieve correct null role if site has no collaborators", async () => {
      // Arrange
      mockSiteRepo.findOne.mockResolvedValue(
        mockSiteOrmResponseWithNoCollaborators
      )

      // Act
      const role = await collaboratorsService.getRole(mockSiteName, mockUserId)

      // Assert
      expect(mockSiteRepo.findOne).toHaveBeenCalled()
      expect(role).toStrictEqual(null)
    })

    it("should retrieve correct null role if site does not exist", async () => {
      // Arrange
      mockSiteRepo.findOne.mockResolvedValue([])

      // Act
      const role = await collaboratorsService.getRole(mockSiteName, mockUserId)

      // Assert
      expect(mockSiteRepo.findOne).toHaveBeenCalled()
      expect(role).toStrictEqual(null)
    })
  })

  describe("delete", () => {
    it("should delete contributor", async () => {
      // Arrange
      mockSiteRepo.findOne.mockResolvedValue(
        mockSiteOrmResponseWithAllCollaborators
      )

      // Act
      await collaboratorsService.delete(mockSiteName, mockUserId)

      // Assert
      expect(mockSiteRepo.findOne).toHaveBeenCalled()
      expect(mockSiteMemberRepo.destroy).toHaveBeenCalled()
    })

    it("should throw error if user is not a member of the site", async () => {
      // Arrange
      mockSiteRepo.findOne.mockResolvedValue(
        mockSiteOrmResponseWithNoCollaborators
      )

      // Act
      const resp = await collaboratorsService.delete(mockSiteName, mockUserId)

      // Assert
      expect(mockSiteRepo.findOne).toHaveBeenCalled()
      expect(mockSiteMemberRepo.destroy).not.toHaveBeenCalled()
      expect(resp instanceof NotFoundError).toBe(true)
    })

    it("should not delete admin if there is only one admin left", async () => {
      // Arrange
      mockSiteRepo.findOne.mockResolvedValue(
        mockSiteOrmResponseWithOneAdminCollaborator
      )

      // Act
      const resp = await collaboratorsService.delete(mockSiteName, mockUserId)

      // Assert
      expect(mockSiteRepo.findOne).toHaveBeenCalled()
      expect(mockSiteMemberRepo.destroy).not.toHaveBeenCalled()
      expect(resp instanceof UnprocessableError).toBe(true)
    })
  })

  describe("create", () => {
    const mockSiteMemberRecord = {
      siteId: mockSiteId,
      userId: mockUserId,
      role: CollaboratorRoles.Contributor,
    }

    it("should create contributor", async () => {
      // Arrange
      collaboratorsService.deriveAllowedRoleFromEmail = (jest.fn(
        () => CollaboratorRoles.Admin
      ) as unknown) as () => Promise<CollaboratorRoles | null>
      mockSitesService.getBySiteName.mockResolvedValue({ id: mockSiteId })
      mockUsersService.findByEmail.mockResolvedValue({ id: mockUserId })
      mockSiteMemberRepo.findOne.mockResolvedValue(null)
      mockSiteMemberRepo.create.mockResolvedValue(mockSiteMemberRecord)

      // Act
      const resp = await collaboratorsService.create(
        mockSiteName,
        mockEmailAddress,
        true
      )

      // Assert
      expect(collaboratorsService.deriveAllowedRoleFromEmail).toBeCalledWith(
        mockEmailAddress
      )
      expect(mockSitesService.getBySiteName).toBeCalledWith(mockSiteName)
      expect(mockUsersService.findByEmail).toBeCalledWith(mockEmailAddress)
      expect(mockSiteMemberRepo.findOne).toBeCalled()
      expect(mockSiteMemberRepo.create).toBeCalled()
      expect(resp).toStrictEqual(mockSiteMemberRecord)
    })

    it("should return error if email is malformed", async () => {
      // Arrange
      const MALFORMED_EMAIL = "test"
      collaboratorsService.deriveAllowedRoleFromEmail = (jest.fn(
        () => CollaboratorRoles.Admin
      ) as unknown) as () => Promise<CollaboratorRoles | null>
      mockSitesService.getBySiteName.mockResolvedValue({ id: mockSiteId })
      mockUsersService.findByEmail.mockResolvedValue({ id: mockUserId })
      mockSiteMemberRepo.findOne.mockResolvedValue(null)
      mockSiteMemberRepo.create.mockResolvedValue(mockSiteMemberRecord)

      // Act
      const resp = await collaboratorsService.create(
        mockSiteName,
        MALFORMED_EMAIL,
        false
      )

      // Assert
      expect(collaboratorsService.deriveAllowedRoleFromEmail).not.toBeCalled()
      expect(mockSitesService.getBySiteName).not.toBeCalledWith(mockSiteName)
      expect(mockUsersService.findByEmail).not.toBeCalledWith(mockEmailAddress)
      expect(mockSiteMemberRepo.findOne).not.toBeCalled()
      expect(mockSiteMemberRepo.create).not.toBeCalled()
      expect(resp instanceof BadRequestError).toBe(true)
    })

    it("should return error if email domain is not whitelisted", async () => {
      // Arrange
      collaboratorsService.deriveAllowedRoleFromEmail = (jest.fn(
        () => null
      ) as unknown) as () => Promise<CollaboratorRoles | null>
      mockSitesService.getBySiteName.mockResolvedValue({ id: mockSiteId })
      mockUsersService.findByEmail.mockResolvedValue({ id: mockUserId })
      mockSiteMemberRepo.findOne.mockResolvedValue(null)
      mockSiteMemberRepo.create.mockResolvedValue(mockSiteMemberRecord)

      // Act
      const resp = await collaboratorsService.create(
        mockSiteName,
        mockEmailAddress,
        false
      )

      // Assert
      expect(collaboratorsService.deriveAllowedRoleFromEmail).toBeCalledWith(
        mockEmailAddress
      )
      expect(mockSitesService.getBySiteName).not.toBeCalled()
      expect(mockUsersService.findByEmail).not.toBeCalled()
      expect(mockSiteMemberRepo.findOne).not.toBeCalled()
      expect(mockSiteMemberRepo.create).not.toBeCalled()
      expect(resp instanceof ForbiddenError).toBe(true)
    })

    it("should return error if site does not exist", async () => {
      // Arrange
      collaboratorsService.deriveAllowedRoleFromEmail = (jest.fn(
        () => CollaboratorRoles.Admin
      ) as unknown) as () => Promise<CollaboratorRoles | null>
      mockSitesService.getBySiteName.mockResolvedValue(null)
      mockUsersService.findByEmail.mockResolvedValue({ id: mockUserId })
      mockSiteMemberRepo.findOne.mockResolvedValue(null)
      mockSiteMemberRepo.create.mockResolvedValue(mockSiteMemberRecord)

      // Act
      const resp = await collaboratorsService.create(
        mockSiteName,
        mockEmailAddress,
        false
      )

      // Assert
      expect(collaboratorsService.deriveAllowedRoleFromEmail).toBeCalledWith(
        mockEmailAddress
      )
      expect(mockSitesService.getBySiteName).toBeCalledWith(mockSiteName)
      expect(mockUsersService.findByEmail).not.toBeCalled()
      expect(mockSiteMemberRepo.findOne).not.toBeCalled()
      expect(mockSiteMemberRepo.create).not.toBeCalled()
      expect(resp instanceof NotFoundError).toBe(true)
    })

    it("should return error if user does not exist", async () => {
      // Arrange
      collaboratorsService.deriveAllowedRoleFromEmail = (jest.fn(
        () => CollaboratorRoles.Admin
      ) as unknown) as () => Promise<CollaboratorRoles | null>
      mockSitesService.getBySiteName.mockResolvedValue({ id: mockSiteId })
      mockUsersService.findByEmail.mockResolvedValue(null)
      mockSiteMemberRepo.findOne.mockResolvedValue(null)
      mockSiteMemberRepo.create.mockResolvedValue(mockSiteMemberRecord)

      // Act
      const resp = await collaboratorsService.create(
        mockSiteName,
        mockEmailAddress,
        false
      )

      // Assert
      expect(collaboratorsService.deriveAllowedRoleFromEmail).toBeCalledWith(
        mockEmailAddress
      )
      expect(mockSitesService.getBySiteName).toBeCalledWith(mockSiteName)
      expect(mockUsersService.findByEmail).toBeCalledWith(mockEmailAddress)
      expect(mockSiteMemberRepo.findOne).not.toBeCalled()
      expect(mockSiteMemberRepo.create).not.toBeCalled()
      expect(resp instanceof NotFoundError).toBe(true)
    })

    it("should return error if user already is a site member", async () => {
      // Arrange
      collaboratorsService.deriveAllowedRoleFromEmail = (jest.fn(
        () => CollaboratorRoles.Admin
      ) as unknown) as () => Promise<CollaboratorRoles | null>
      mockSitesService.getBySiteName.mockResolvedValue({ id: mockSiteId })
      mockUsersService.findByEmail.mockResolvedValue({ id: mockUserId })
      mockSiteMemberRepo.findOne.mockResolvedValue(mockSiteMemberRecord)
      mockSiteMemberRepo.create.mockResolvedValue(mockSiteMemberRecord)

      // Act
      const resp = await collaboratorsService.create(
        mockSiteName,
        mockEmailAddress,
        false
      )

      // Assert
      expect(collaboratorsService.deriveAllowedRoleFromEmail).toBeCalledWith(
        mockEmailAddress
      )
      expect(mockSitesService.getBySiteName).toBeCalledWith(mockSiteName)
      expect(mockUsersService.findByEmail).toBeCalledWith(mockEmailAddress)
      expect(mockSiteMemberRepo.findOne).toBeCalled()
      expect(mockSiteMemberRepo.create).not.toBeCalled()
      expect(resp instanceof ConflictError).toBe(true)
    })

    it("should return error if acknowledgement is not done and if the user is going to be a contributor", async () => {
      // Arrange
      collaboratorsService.deriveAllowedRoleFromEmail = (jest.fn(
        () => CollaboratorRoles.Contributor
      ) as unknown) as () => Promise<CollaboratorRoles | null>
      mockSitesService.getBySiteName.mockResolvedValue({ id: mockSiteId })
      mockUsersService.findByEmail.mockResolvedValue({ id: mockUserId })
      mockSiteMemberRepo.findOne.mockResolvedValue(null)
      mockSiteMemberRepo.create.mockResolvedValue(mockSiteMemberRecord)

      // Act
      const resp = await collaboratorsService.create(
        mockSiteName,
        mockEmailAddress,
        false
      )

      // Assert
      expect(collaboratorsService.deriveAllowedRoleFromEmail).toBeCalledWith(
        mockEmailAddress
      )
      expect(mockSitesService.getBySiteName).toBeCalledWith(mockSiteName)
      expect(mockUsersService.findByEmail).toBeCalledWith(mockEmailAddress)
      expect(mockSiteMemberRepo.findOne).toBeCalled()
      expect(mockSiteMemberRepo.create).not.toBeCalled()
      expect(resp instanceof UnprocessableError).toBe(true)
    })
  })
})
