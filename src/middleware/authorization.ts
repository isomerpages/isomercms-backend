import autoBind from "auto-bind"
import { NextFunction, Request, Response } from "express"

import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import { RequestHandler } from "@root/types"
import AuthorizationMiddlewareService from "@services/middlewareServices/AuthorizationMiddlewareService"

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
  checkIsSiteMember: RequestHandler<
    never,
    unknown,
    unknown,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res, next) => {
    const { userWithSiteSessionData } = res.locals

    await this.authorizationMiddlewareService.checkIsSiteMember(
      userWithSiteSessionData
    )

    return next()
  }
}
