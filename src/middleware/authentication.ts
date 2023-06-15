import autoBind from "auto-bind"
import { NextFunction, Request, Response } from "express"
import { Session } from "express-session"

import UserSessionData from "@root/classes/UserSessionData"
import AuthenticationMiddlewareService from "@root/services/middlewareServices/AuthenticationMiddlewareService"
import { SessionData } from "@root/types/express/session"

interface RequestWithSession extends Request {
  session: Session & SessionData
}

// eslint-disable-next-line import/prefer-default-export
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

  async verifyAccess(
    req: RequestWithSession,
    res: Response,
    next: NextFunction
  ) {
    const { cookies, originalUrl: url, session } = req
    const {
      isomerUserId,
      email,
      ...rest
    } = await this.authenticationMiddlewareService.verifyAccess({
      cookies,
      url,
      userInfo: session.userInfo,
    })
    const userSessionData = new UserSessionData({
      isomerUserId,
      email,
      ...rest,
    })
    res.locals.userSessionData = userSessionData
    return next()
  }
}
