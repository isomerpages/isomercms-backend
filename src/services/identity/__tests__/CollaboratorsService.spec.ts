import { errAsync, okAsync } from "neverthrow"
import { ModelStatic } from "sequelize"
import { Sequelize } from "sequelize-typescript"

import { ForbiddenError } from "@errors/ForbiddenError"
import { NotFoundError } from "@errors/NotFoundError"
import { UnprocessableError } from "@errors/UnprocessableError"

import { Site, SiteMember, User, Whitelist } from "@database/models"
import {
  expectedSortedMockCollaboratorsList,
  mockSiteOrmResponseWithAllCollaborators,
  mockSiteOrmResponseWithOneAdminCollaborator,
  mockSiteOrmResponseWithOneContributorCollaborator,
  mockSiteOrmResponseWithNoCollaborators,
  mockCollaboratorAdmin1,
  mockCollaboratorAdmin2,
} from "@fixtures/identity"
import {
  CollaboratorRoles,
  CollaboratorRolesWithoutIsomerAdmin,
  INACTIVE_USER_THRESHOLD_DAYS,
  ISOMER_SUPPORT_EMAIL,
} from "@root/constants"
import { BadRequestError } from "@root/errors/BadRequestError"
import { ConflictError } from "@root/errors/ConflictError"
import { mailer } from "@root/services/utilServices/MailClient"
import CollaboratorsService from "@services/identity/CollaboratorsService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import SitesService from "@services/identity/SitesService"
import UsersService from "@services/identity/UsersService"
import { sequelize } from "@tests/database"

describe("CollaboratorsService", () => {
  const mockSiteName = "sitename"
  const mockEmailAddress = "test1@test.gov.sg"
  const mockSiteId = 1
  const mockUserId = "2"
  const mockWhitelistId = 3
  const MockSequelize = {
    query: jest.fn(),
  }
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

  const mockIsomerAdminsService = {
    isUserIsomerAdmin: jest.fn(),
  }
  const mockSitesService = {
    getBySiteName: jest.fn(),
  }
  const mockUsersService = {
    findOrCreateByEmail: jest.fn(),
    getWhitelistRecordsFromEmail: jest.fn(),
  }

  const collaboratorsService = new CollaboratorsService({
    sequelize: (MockSequelize as unknown) as Sequelize,
    siteRepository: (mockSiteRepo as unknown) as ModelStatic<Site>,
    siteMemberRepository: (mockSiteMemberRepo as unknown) as ModelStatic<SiteMember>,
    isomerAdminsService: (mockIsomerAdminsService as unknown) as IsomerAdminsService,
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
          email: mockEmailAddress,
          expiry: null,
        },
      ]
      mockUsersService.getWhitelistRecordsFromEmail.mockResolvedValue(
        mockWhitelistEntries
      )

      // Act
      const role = await collaboratorsService.deriveAllowedRoleFromEmail(
        mockEmailAddress
      )

      // Assert
      expect(role).toStrictEqual(CollaboratorRoles.Admin)
      expect(mockUsersService.getWhitelistRecordsFromEmail).toHaveBeenCalled()
    })

    it("should derive contributor role for valid contributor-eligible emails", async () => {
      // Arrange
      const mockWhitelistEntries = [
        {
          email: mockEmailAddress,
          expiry: new Date(),
        },
      ]
      mockUsersService.getWhitelistRecordsFromEmail.mockResolvedValue(
        mockWhitelistEntries
      )

      // Act
      const role = await collaboratorsService.deriveAllowedRoleFromEmail(
        mockEmailAddress
      )

      // Assert
      expect(role).toStrictEqual(CollaboratorRoles.Contributor)
      expect(mockUsersService.getWhitelistRecordsFromEmail).toHaveBeenCalled()
    })

    it("should derive no role for emails from non-whitelisted domains", async () => {
      // Arrange
      const mockWhitelistEntries: never[] = []
      mockUsersService.getWhitelistRecordsFromEmail.mockResolvedValue(
        mockWhitelistEntries as Whitelist[]
      )

      // Act
      const role = await collaboratorsService.deriveAllowedRoleFromEmail(
        mockEmailAddress
      )

      // Assert
      expect(role).toStrictEqual(null)
      expect(mockUsersService.getWhitelistRecordsFromEmail).toHaveBeenCalled()
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
      MockSequelize.query.mockResolvedValue([{ role: CollaboratorRoles.Admin }])
      mockIsomerAdminsService.isUserIsomerAdmin.mockResolvedValue(false)

      // Act
      const role = await collaboratorsService.getRole(mockSiteName, mockUserId)

      // Assert
      expect(MockSequelize.query).toHaveBeenCalled()
      expect(role).toStrictEqual(CollaboratorRoles.Admin)

      // isUserIsomerAdmin() should not have been called if a valid role was retrieved
      expect(mockIsomerAdminsService.isUserIsomerAdmin).not.toHaveBeenCalled()
    })

    it("should retrieve correct contributor role", async () => {
      // Arrange
      MockSequelize.query.mockResolvedValue([
        { role: CollaboratorRoles.Contributor },
      ])
      mockIsomerAdminsService.isUserIsomerAdmin.mockResolvedValue(false)

      // Act
      const role = await collaboratorsService.getRole(mockSiteName, mockUserId)

      // Assert
      expect(MockSequelize.query).toHaveBeenCalled()
      expect(role).toStrictEqual(CollaboratorRoles.Contributor)

      // isUserIsomerAdmin() should not have been called if a valid role was retrieved
      expect(mockIsomerAdminsService.isUserIsomerAdmin).not.toHaveBeenCalled()
    })

    it("should retrieve correct null role if site has no collaborators", async () => {
      // Arrange
      MockSequelize.query.mockResolvedValue([])
      mockIsomerAdminsService.isUserIsomerAdmin.mockResolvedValue(false)

      // Act
      const role = await collaboratorsService.getRole(mockSiteName, mockUserId)

      // Assert
      expect(MockSequelize.query).toHaveBeenCalled()
      expect(mockIsomerAdminsService.isUserIsomerAdmin).toHaveBeenCalled()
      expect(role).toStrictEqual(null)
    })

    it("should retrieve correct Isomer admin role if user is not a collaborator but is an Isomer admin", async () => {
      // Arrange
      MockSequelize.query.mockResolvedValue([])
      mockIsomerAdminsService.isUserIsomerAdmin.mockResolvedValue(true)

      // Act
      const role = await collaboratorsService.getRole(mockSiteName, mockUserId)

      // Assert
      expect(MockSequelize.query).toHaveBeenCalled()
      expect(mockIsomerAdminsService.isUserIsomerAdmin).toHaveBeenCalled()
      expect(role).toStrictEqual(CollaboratorRoles.IsomerAdmin)
    })

    it("should retrieve correct null role if site does not exist", async () => {
      // Arrange
      MockSequelize.query.mockResolvedValue([])
      mockIsomerAdminsService.isUserIsomerAdmin.mockResolvedValue(false)

      // Act
      const role = await collaboratorsService.getRole(mockSiteName, mockUserId)

      // Assert
      expect(MockSequelize.query).toHaveBeenCalled()
      expect(mockIsomerAdminsService.isUserIsomerAdmin).toHaveBeenCalled()
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
      ) as unknown) as () => Promise<CollaboratorRolesWithoutIsomerAdmin | null>
      mockSitesService.getBySiteName.mockReturnValue(
        okAsync({ id: mockSiteId })
      )
      mockUsersService.findOrCreateByEmail.mockResolvedValue({ id: mockUserId })
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
      expect(mockUsersService.findOrCreateByEmail).toBeCalledWith(
        mockEmailAddress
      )
      expect(mockSiteMemberRepo.findOne).toBeCalled()
      expect(mockSiteMemberRepo.create).toBeCalled()
      expect(resp).toStrictEqual(mockSiteMemberRecord)
    })

    it("should return error if email is malformed", async () => {
      // Arrange
      const MALFORMED_EMAIL = "test"
      collaboratorsService.deriveAllowedRoleFromEmail = (jest.fn(
        () => CollaboratorRoles.Admin
      ) as unknown) as () => Promise<CollaboratorRolesWithoutIsomerAdmin | null>
      mockSitesService.getBySiteName.mockResolvedValue({ id: mockSiteId })
      mockUsersService.findOrCreateByEmail.mockResolvedValue({ id: mockUserId })
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
      expect(mockUsersService.findOrCreateByEmail).not.toBeCalledWith(
        mockEmailAddress
      )
      expect(mockSiteMemberRepo.findOne).not.toBeCalled()
      expect(mockSiteMemberRepo.create).not.toBeCalled()
      expect(resp instanceof BadRequestError).toBe(true)
    })

    it("should return error if email domain is not whitelisted", async () => {
      // Arrange
      collaboratorsService.deriveAllowedRoleFromEmail = (jest.fn(
        () => null
      ) as unknown) as () => Promise<CollaboratorRolesWithoutIsomerAdmin | null>
      mockSitesService.getBySiteName.mockResolvedValue({ id: mockSiteId })
      mockUsersService.findOrCreateByEmail.mockResolvedValue({ id: mockUserId })
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
      expect(mockUsersService.findOrCreateByEmail).not.toBeCalled()
      expect(mockSiteMemberRepo.findOne).not.toBeCalled()
      expect(mockSiteMemberRepo.create).not.toBeCalled()
      expect(resp instanceof ForbiddenError).toBe(true)
    })

    it("should return error if site does not exist", async () => {
      // Arrange
      collaboratorsService.deriveAllowedRoleFromEmail = (jest.fn(
        () => CollaboratorRoles.Admin
      ) as unknown) as () => Promise<CollaboratorRolesWithoutIsomerAdmin | null>
      mockSitesService.getBySiteName.mockResolvedValue(errAsync(null))
      mockUsersService.findOrCreateByEmail.mockResolvedValue({ id: mockUserId })
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
      expect(mockUsersService.findOrCreateByEmail).not.toBeCalled()
      expect(mockSiteMemberRepo.findOne).not.toBeCalled()
      expect(mockSiteMemberRepo.create).not.toBeCalled()
      expect(resp instanceof NotFoundError).toBe(true)
    })

    it("should return error if user already is a site member", async () => {
      // Arrange
      collaboratorsService.deriveAllowedRoleFromEmail = (jest.fn(
        () => CollaboratorRoles.Admin
      ) as unknown) as () => Promise<CollaboratorRolesWithoutIsomerAdmin | null>
      mockSitesService.getBySiteName.mockResolvedValue(
        okAsync({ id: mockSiteId })
      )
      mockUsersService.findOrCreateByEmail.mockResolvedValue({ id: mockUserId })
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
      expect(mockUsersService.findOrCreateByEmail).toBeCalledWith(
        mockEmailAddress
      )
      expect(mockSiteMemberRepo.findOne).toBeCalled()
      expect(mockSiteMemberRepo.create).not.toBeCalled()
      expect(resp instanceof ConflictError).toBe(true)
    })

    it("should return error if acknowledgement is not done and if the user is going to be a contributor", async () => {
      // Arrange
      collaboratorsService.deriveAllowedRoleFromEmail = (jest.fn(
        () => CollaboratorRoles.Contributor
      ) as unknown) as () => Promise<CollaboratorRolesWithoutIsomerAdmin | null>
      mockSitesService.getBySiteName.mockResolvedValue(
        okAsync({ id: mockSiteId })
      )
      mockUsersService.findOrCreateByEmail.mockResolvedValue({ id: mockUserId })
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
      expect(mockUsersService.findOrCreateByEmail).toBeCalledWith(
        mockEmailAddress
      )
      expect(mockSiteMemberRepo.findOne).toBeCalled()
      expect(mockSiteMemberRepo.create).not.toBeCalled()
      expect(resp instanceof UnprocessableError).toBe(true)
    })
  })

  describe("getStatistics", () => {
    const inactiveDate = new Date()
    inactiveDate.setDate(
      inactiveDate.getDate() - INACTIVE_USER_THRESHOLD_DAYS - 1
    )
    const mockActiveCollaborator: Partial<User> = {
      lastLoggedIn: new Date(),
    }
    const mockInactiveCollaborator: Partial<User> = {
      lastLoggedIn: inactiveDate,
    }

    it("should return non-zero collaborators statistics", async () => {
      // Arrange
      const expected = {
        total: 2,
        inactive: 1,
      }
      mockSiteRepo.findOne.mockResolvedValue({
        site_members: [mockActiveCollaborator, mockInactiveCollaborator],
      })

      // Act
      const actual = await collaboratorsService.getStatistics(mockSiteName)

      // Assert
      expect(actual).toEqual(expected)
      expect(mockSiteRepo.findOne).toBeCalled()
    })

    it("should return zero inactive collaborators statistics if there is none", async () => {
      // Arrange
      const expected = {
        total: 1,
        inactive: 0,
      }
      mockSiteRepo.findOne.mockResolvedValue({
        site_members: [mockActiveCollaborator],
      })

      // Act
      const actual = await collaboratorsService.getStatistics(mockSiteName)

      // Assert
      expect(actual).toEqual(expected)
      expect(mockSiteRepo.findOne).toBeCalled()
    })

    it("should return NotFoundError if site is not found", async () => {
      // Arrange
      const expected = {
        total: 0,
        inactive: 0,
      }
      mockSiteRepo.findOne.mockResolvedValue(null)

      // Act
      await expect(
        collaboratorsService.getStatistics(mockSiteName)
      ).resolves.toBeInstanceOf(NotFoundError)

      // Assert
      expect(mockSiteRepo.findOne).toBeCalled()
    })
  })

  describe("notify", () => {
    it("should send an email to all site admins", async () => {
      // Arrange
      mockSiteRepo.findOne.mockResolvedValue(
        mockSiteOrmResponseWithAllCollaborators
      )
      const spySendMailWithCc = jest.spyOn(mailer, "sendMailWithCc")
      spySendMailWithCc.mockResolvedValueOnce()

      // Act
      await collaboratorsService.notify(
        mockSiteName,
        "subject",
        "body",
        mockEmailAddress
      )

      // Assert
      expect(mockSiteRepo.findOne).toHaveBeenCalledOnce()
      expect(spySendMailWithCc).toHaveBeenCalledWith(
        mockCollaboratorAdmin1.email,
        "Isomer Team",
        [mockCollaboratorAdmin2.email, mockEmailAddress, ISOMER_SUPPORT_EMAIL],
        ISOMER_SUPPORT_EMAIL,
        "subject",
        "body"
      )
    })

    it("should return a NotFoundError if the site does not have any admins", async () => {
      // Arrange
      mockSiteRepo.findOne.mockResolvedValue(
        mockSiteOrmResponseWithOneContributorCollaborator
      )
      const spySendMailWithCc = jest.spyOn(mailer, "sendMailWithCc")

      // Act
      const result = await collaboratorsService.notify(
        mockSiteName,
        "subject",
        "body",
        mockEmailAddress
      )

      // Assert
      expect(result).toBeInstanceOf(NotFoundError)
      expect(mockSiteRepo.findOne).toHaveBeenCalledOnce()
      expect(spySendMailWithCc).not.toHaveBeenCalled()
    })
  })

  describe("notifyWithDnsRecords", () => {
    it("should send an email to all site admins with DNS records", async () => {
      // Arrange
      mockSiteRepo.findOne.mockResolvedValue(
        mockSiteOrmResponseWithAllCollaborators
      )
      const spySendMailWithCc = jest.spyOn(mailer, "sendMailWithCc")
      spySendMailWithCc.mockResolvedValueOnce()
      const dnsRecords = [
        {
          source: "source",
          target: "target",
          type: "A" as const,
        },
      ]

      // Act
      await collaboratorsService.notifyWithDnsRecords(
        "main",
        mockSiteName,
        "domain",
        dnsRecords,
        mockEmailAddress
      )

      // Assert
      expect(mockSiteRepo.findOne).toHaveBeenCalledOnce()
      expect(spySendMailWithCc).toHaveBeenCalledWith(
        mockCollaboratorAdmin1.email,
        "Isomer Team",
        [mockCollaboratorAdmin2.email, mockEmailAddress, ISOMER_SUPPORT_EMAIL],
        ISOMER_SUPPORT_EMAIL,
        expect.any(String),
        expect.any(String)
      )
    })
  })
})
