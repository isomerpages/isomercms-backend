import autoBind from "auto-bind"
import { NextFunction, Request, Response } from "express"
import { ParamsDictionary } from "express-serve-static-core"
import { ParsedQs } from "qs"

import { ForbiddenError } from "@errors/ForbiddenError"

import { AuthorizationMiddleware } from "@middleware/authorization"

import { CollaboratorRoles } from "@root/constants"
import AuthorizationMiddlewareService from "@root/services/middlewareServices/AuthorizationMiddlewareService"

describe("Authorization middleware", () => {
  const TEST_SITE_NAME = "sitename"
  const TEST_ISOMER_USER_ID = "1"
  const mockAuthorizationMiddlewareService = {
    checkIsSiteAdmin: jest.fn(),
    checkIsSiteMember: jest.fn(),
  }
  const mockReq = ({
    params: { siteName: TEST_SITE_NAME },
  } as unknown) as Request<
    ParamsDictionary,
    any,
    any,
    ParsedQs,
    Record<string, any>
  >
  const mockRes = ({
    locals: {
      sessionData: { getIsomerUserId: jest.fn(() => TEST_ISOMER_USER_ID) },
    },
  } as unknown) as Response
  const mockNext = jest.fn() as NextFunction

  const authorizationMiddleware = new AuthorizationMiddleware({
    authorizationMiddlewareService: (mockAuthorizationMiddlewareService as unknown) as AuthorizationMiddlewareService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("verifySiteAdmin", () => {
    it("correctly verifies that user is a site admin if no error is thrown in the authorization middleware service", async () => {
      // Arrange
      mockAuthorizationMiddlewareService.checkIsSiteAdmin.mockResolvedValue(
        undefined
      )

      // Act
      await authorizationMiddleware.verifySiteAdmin(mockReq, mockRes, mockNext)

      // Assert
      expect(
        mockAuthorizationMiddlewareService.checkIsSiteAdmin
      ).toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalledWith()
    })

    it("correctly verifies that user is not site admin if an error is thrown in the authorization middleware service", async () => {
      // Arrange
      mockAuthorizationMiddlewareService.checkIsSiteAdmin.mockResolvedValue(
        new ForbiddenError()
      )

      // Act
      await authorizationMiddleware.verifySiteAdmin(mockReq, mockRes, mockNext)

      // Assert
      expect(
        mockAuthorizationMiddlewareService.checkIsSiteAdmin
      ).toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalledWith(new ForbiddenError())
    })
  })

  describe("verifySiteMember", () => {
    it("correctly verifies that user is a site member if no error is thrown in the authorization middleware service", async () => {
      // Arrange
      mockAuthorizationMiddlewareService.checkIsSiteMember.mockResolvedValue(
        undefined
      )

      // Act
      await authorizationMiddleware.verifySiteMember(mockReq, mockRes, mockNext)

      // Assert
      expect(
        mockAuthorizationMiddlewareService.checkIsSiteMember
      ).toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalledWith()
    })

    it("correctly verifies that user is not site member if an error is thrown in the authorization middleware service", async () => {
      // Arrange
      mockAuthorizationMiddlewareService.checkIsSiteMember.mockResolvedValue(
        new ForbiddenError()
      )

      // Act
      await authorizationMiddleware.verifySiteMember(mockReq, mockRes, mockNext)

      // Assert
      expect(
        mockAuthorizationMiddlewareService.checkIsSiteMember
      ).toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalledWith(new ForbiddenError())
    })
  })
})
