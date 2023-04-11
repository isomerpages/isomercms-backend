import autoBind from "auto-bind"

import { ForbiddenError } from "@errors/ForbiddenError"

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

  // Allows access only to users using email login
  // If using Github login, immediately returns 200 response instead
  verifyIsEmailUser: RequestHandler<
    never,
    unknown,
    unknown,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res, next) => {
    const { userWithSiteSessionData } = res.locals
    // TODO (IS-90): Remove when the frontend handles the
    // 4xx properly rather than returning a 200 OK.
    if (!userWithSiteSessionData.isEmailUser())
      return res.status(200).send("OK")
    return next()
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
