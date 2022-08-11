import autoBind from "auto-bind"

import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"
import { ForbiddenError } from "@errors/ForbiddenError"
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

  // Check whether a user is a site admin
  verifySiteAdmin: RequestHandler<
    never,
    unknown,
    unknown,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res, next) => {
    const { userWithSiteSessionData } = res.locals

    try {
      const result = await this.authorizationMiddlewareService.checkIsSiteAdmin(
        userWithSiteSessionData
      )
      if (result instanceof ForbiddenError) return next(new ForbiddenError())

      return next()
    } catch (err) {
      return next(err)
    }
  }

  // Check whether a user is a site member
  verifySiteMember: RequestHandler<
    never,
    unknown,
    unknown,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res, next) => {
    const { userWithSiteSessionData } = res.locals

    try {
      const result = await this.authorizationMiddlewareService.checkIsSiteMember(
        userWithSiteSessionData
      )
      if (result instanceof ForbiddenError) return next(new ForbiddenError())

      return next()
    } catch (err) {
      return next(err)
    }
  }
}
