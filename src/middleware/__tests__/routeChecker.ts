import { NextFunction, Request, Response } from "express"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { BadRequestError } from "@root/errors/BadRequestError"

import { RouteCheckerMiddleware } from "../routeChecker"

describe("Authorization middleware", () => {
  const TEST_SITE_NAME = "site-name"
  const TEST_INVALID_SITE_NAME = "blah%2Fblah"
  const mockRes = ({} as unknown) as Response
  const mockNext = jest.fn() as NextFunction

  const routeCheckerMiddleware = new RouteCheckerMiddleware()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("verifySiteName", () => {
    it("allows through proper site names", async () => {
      // Arrange
      const mockReq = ({
        params: { siteName: TEST_SITE_NAME },
      } as unknown) as Request<
        never,
        unknown,
        unknown,
        never,
        { userWithSiteSessionData: UserWithSiteSessionData }
      >

      // Act
      await routeCheckerMiddleware.verifySiteName(mockReq, mockRes, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalledWith()
    })

    it("blocks improper site names", async () => {
      // Arrange
      const mockInvalidReq = ({
        params: { siteName: TEST_INVALID_SITE_NAME },
      } as unknown) as Request<
        never,
        unknown,
        unknown,
        never,
        { userWithSiteSessionData: UserWithSiteSessionData }
      >

      // Act
      await routeCheckerMiddleware.verifySiteName(
        mockInvalidReq,
        mockRes,
        mockNext
      )

      // Assert
      expect(mockNext).toHaveBeenCalledWith(
        new BadRequestError("Invalid site name")
      )
    })
  })
})
