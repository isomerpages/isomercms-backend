import autoBind from "auto-bind"
import { NextFunction, Request, Response } from "express"

import UserSessionData from "@root/classes/UserSessionData"
import { AuthMiddlewareService } from "@root/services/middlewareServices/AuthMiddlewareService"

export class AuthMiddleware {
  private readonly authMiddlewareService: AuthMiddlewareService

  constructor({
    authMiddlewareService,
  }: {
    authMiddlewareService: AuthMiddlewareService
  }) {
    this.authMiddlewareService = authMiddlewareService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  verifyJwt(req: Request, res: Response, next: NextFunction) {
    const { cookies, originalUrl: url } = req
    const {
      accessToken,
      githubId,
      isomerUserId,
      email,
    } = this.authMiddlewareService.verifyJwt({
      cookies,
      url,
    })
    const userSessionData = new UserSessionData({
      accessToken,
      githubId,
      isomerUserId,
      email,
    })
    res.locals.userSessionData = userSessionData
    return next()
  }

  // Replace access token with site access token if it is available
  async checkHasAccess(req: Request, res: Response, next: NextFunction) {
    const { userSessionData } = res.locals

    await this.authMiddlewareService.checkHasAccess(userSessionData)

    return next()
  }
}
