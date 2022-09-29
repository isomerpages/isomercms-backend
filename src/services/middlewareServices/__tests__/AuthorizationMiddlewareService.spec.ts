import { rejects } from "assert"

import { NotFoundError } from "@errors/NotFoundError"

import {
  mockUserWithSiteSessionData,
  mockIsomerUserId,
  mockSessionDataEmailUserWithSite,
  mockSiteName,
} from "@fixtures/sessionData"
import AuthService from "@root/services/identity/AuthService"
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

  const service = new AuthorizationMiddlewareService({
    identityAuthService: (mockIdentityAuthService as unknown) as AuthService,
    usersService: (mockUsersService as unknown) as UsersService,
    isomerAdminsService: (mockIsomerAdminsService as unknown) as IsomerAdminsService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("checkIsSiteMember", () => {
    it("Allows access for email users with site access", async () => {
      // Arrange
      mockIsomerAdminsService.getByUserId.mockImplementationOnce(() => null)
      mockUsersService.hasAccessToSite.mockImplementationOnce(() => true)

      // Act
      const actual = service.checkIsSiteMember(mockSessionDataEmailUserWithSite)

      // Assert
      await expect(actual).resolves.not.toThrow()
      expect(mockIdentityAuthService.hasAccessToSite).toHaveBeenCalledTimes(0)
      expect(mockUsersService.hasAccessToSite).toHaveBeenCalledWith(
        mockIsomerUserId,
        mockSiteName
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
      const actual = service.checkIsSiteMember(mockUserWithSiteSessionData)

      // Assert
      await expect(actual).resolves.not.toThrow()
      expect(mockUsersService.hasAccessToSite).toHaveBeenCalledTimes(0)
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
      mockUsersService.hasAccessToSite.mockImplementationOnce(() => false)

      // Act
      const actual = service.checkIsSiteMember(mockSessionDataEmailUserWithSite)

      // Assert
      await expect(actual).resolves.not.toThrow()
      expect(mockIdentityAuthService.hasAccessToSite).toHaveBeenCalledTimes(0)
      expect(mockUsersService.hasAccessToSite).toHaveBeenCalledWith(
        mockIsomerUserId,
        mockSiteName
      )
      expect(mockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
    })

    it("Throws error for users without site access", async () => {
      // Arrange
      mockIsomerAdminsService.getByUserId.mockImplementationOnce(() => null)
      mockUsersService.hasAccessToSite.mockImplementationOnce(() => false)

      // Act
      const actual = service.checkIsSiteMember(mockSessionDataEmailUserWithSite)

      // Assert
      await expect(actual).rejects.toThrowError(NotFoundError)
      expect(mockIdentityAuthService.hasAccessToSite).toHaveBeenCalledTimes(0)
      expect(mockUsersService.hasAccessToSite).toHaveBeenCalledWith(
        mockIsomerUserId,
        mockSiteName
      )
      expect(mockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
    })
  })
})
