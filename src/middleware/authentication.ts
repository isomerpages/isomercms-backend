import autoBind from "auto-bind"
import { NextFunction, Request, Response } from "express"
import { Session } from "express-session"

import UserSessionData from "@root/classes/UserSessionData"
import AuthenticationMiddlewareService from "@root/services/middlewareServices/AuthenticationMiddlewareService"
import { SessionData } from "@root/types/express/session"

interface RequestWithSession extends Request {
  session: Session & SessionData
}

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

  verifyAccess(req: RequestWithSession, res: Response, next: NextFunction) {
    const { cookies, originalUrl: url, session } = req
    const {
      accessToken,
      githubId,
      isomerUserId,
      email,
    } = this.authenticationMiddlewareService.verifyAccess({
      cookies,
      url,
      userInfo: session.userInfo,
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
