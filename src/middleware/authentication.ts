import autoBind from "auto-bind"
import { NextFunction, Request, Response } from "express"

import UserSessionData from "@root/classes/UserSessionData"
import AuthenticationMiddlewareService from "@root/services/middlewareServices/AuthenticationMiddlewareService"

export class AuthenticationMiddleware {
  private readonly authenticationMiddlewareService: AuthenticationMiddlewareService

  constructor({
    authenticationMiddlewareService,
  }: {
    authenticationMiddlewareService: AuthenticationMiddlewareService
  }) {
    this.authenticationMiddlewareService = authenticationMiddlewareService
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
    } = this.authenticationMiddlewareService.verifyJwt({
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
}
