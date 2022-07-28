import autoBind from "auto-bind"
import { NextFunction, Request, Response } from "express"

import AuthorizationMiddlewareService from "@root/services/middlewareServices/AuthorizationMiddlewareService"

export class AuthorizationMiddleware {
  private readonly authorizationMiddlewareService: AuthorizationMiddlewareService

  constructor({
    authorizationMiddlewareService,
  }: {
    authorizationMiddlewareService: AuthorizationMiddlewareService
  }) {
    this.authorizationMiddlewareService = authorizationMiddlewareService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Check whether a user is a site member
  async checkIsSiteMember(req: Request, res: Response, next: NextFunction) {
    const { sessionData } = res.locals

    await this.authorizationMiddlewareService.checkIsSiteMember(sessionData)

    return next()
  }
}
