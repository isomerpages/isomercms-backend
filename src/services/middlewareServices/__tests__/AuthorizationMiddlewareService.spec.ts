import {
  mockUserWithSiteSessionData,
  mockIsomerUserId,
  mockSessionDataEmailUserWithSite,
  mockSiteName,
} from "@fixtures/sessionData"
import { CollaboratorRoles } from "@root/constants"
import { ForbiddenError } from "@root/errors/ForbiddenError"
import AuthService from "@root/services/identity/AuthService"
import CollaboratorsService from "@root/services/identity/CollaboratorsService"
import IsomerAdminsService from "@root/services/identity/IsomerAdminsService"
import UsersService from "@root/services/identity/UsersService"

import AuthorizationMiddlewareService from "../AuthorizationMiddlewareService"

describe("Authorization Middleware Service", () => {
  const mockIdentityAuthService = {
    hasAccessToSite: jest.fn(),
  }

  const mockUsersService = {
    hasAccessToSite: jest.fn(),
  }

  const mockIsomerAdminsService = {
    getByUserId: jest.fn(),
  }

  const mockCollaboratorsService = {
    getRole: jest.fn(),
  }

  const service = new AuthorizationMiddlewareService({
    identityAuthService: (mockIdentityAuthService as unknown) as AuthService,
    usersService: (mockUsersService as unknown) as UsersService,
    isomerAdminsService: (mockIsomerAdminsService as unknown) as IsomerAdminsService,
    collaboratorsService: (mockCollaboratorsService as unknown) as CollaboratorsService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("checkIsSiteMember", () => {
    it("Allows access for email users with site access", async () => {
      // Arrange
      mockIsomerAdminsService.getByUserId.mockImplementationOnce(() => null)
      mockCollaboratorsService.getRole.mockImplementationOnce(
        () => CollaboratorRoles.Contributor
      )

      // Act
      const actual = await service.checkIsSiteMember(
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual instanceof ForbiddenError).toBe(false)
      expect(mockIdentityAuthService.hasAccessToSite).toHaveBeenCalledTimes(0)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledWith(
        mockSiteName,
        mockIsomerUserId
      )
      expect(mockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
    })

    it("Allows access for github users with site access", async () => {
      // Arrange
      mockIsomerAdminsService.getByUserId.mockImplementationOnce(() => null)
      mockIdentityAuthService.hasAccessToSite.mockImplementationOnce(() => true)

      // Act
      const actual = await service.checkIsSiteMember(
        mockUserWithSiteSessionData
      )

      // Assert
      expect(actual instanceof ForbiddenError).toBe(false)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledTimes(0)
      expect(mockIdentityAuthService.hasAccessToSite).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
      expect(mockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
    })

    it("Allows access for admin users even without site access", async () => {
      // Arrange
      mockIsomerAdminsService.getByUserId.mockImplementationOnce(
        () => "adminObj"
      )
      mockCollaboratorsService.getRole.mockImplementationOnce(
        () => CollaboratorRoles.Admin
      )

      // Act
      const actual = await service.checkIsSiteMember(
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual instanceof ForbiddenError).toBe(false)
      expect(mockIdentityAuthService.hasAccessToSite).toHaveBeenCalledTimes(0)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledWith(
        mockSiteName,
        mockIsomerUserId
      )
      expect(mockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
    })

    it("Throws error for users without site access", async () => {
      // Arrange
      mockIsomerAdminsService.getByUserId.mockImplementationOnce(() => null)
      mockCollaboratorsService.getRole.mockImplementationOnce(() => null)

      // Act
      const actual = await service.checkIsSiteMember(
        mockSessionDataEmailUserWithSite
      )

      // Assert
      expect(actual)
      expect(actual instanceof ForbiddenError).toBe(true)
      expect(mockIdentityAuthService.hasAccessToSite).toHaveBeenCalledTimes(0)
      expect(mockCollaboratorsService.getRole).toHaveBeenCalledWith(
        mockSiteName,
        mockIsomerUserId
      )
      expect(mockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
    })
  })
})
