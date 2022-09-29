import { NotFoundError } from "@errors/NotFoundError"

import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import { E2E_ISOMER_ID } from "@root/constants"
import AuthService from "@services/identity/AuthService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import UsersService from "@services/identity/UsersService"

// Import logger
const logger = require("@logger/logger")

interface AuthorizationMiddlewareServiceProps {
  identityAuthService: AuthService
  usersService: UsersService
  isomerAdminsService: IsomerAdminsService
}

export default class AuthorizationMiddlewareService {
  readonly identityAuthService: AuthorizationMiddlewareServiceProps["identityAuthService"]

  readonly usersService: AuthorizationMiddlewareServiceProps["usersService"]

  readonly isomerAdminsService: AuthorizationMiddlewareServiceProps["isomerAdminsService"]

  constructor({
    identityAuthService,
    usersService,
    isomerAdminsService,
  }: AuthorizationMiddlewareServiceProps) {
    this.identityAuthService = identityAuthService
    this.usersService = usersService
    this.isomerAdminsService = isomerAdminsService
  }

  async checkIsSiteMember(sessionData: UserWithSiteSessionData) {
    // Check if user has access to site
    const { siteName, isomerUserId: userId } = sessionData

    // Should always be defined - authorization middleware only exists if siteName is defined
    if (!siteName) throw Error("No site name in authorization middleware")

    logger.info(`Verifying user's access to ${siteName}`)

    const isE2EUser = userId === E2E_ISOMER_ID
    if (isE2EUser) return

    const isSiteMember = await (sessionData.isEmailUser()
      ? this.usersService.hasAccessToSite(userId, siteName)
      : this.identityAuthService.hasAccessToSite(sessionData))

    const isAdminUser = await this.isomerAdminsService.getByUserId(userId)

    if (!isSiteMember && !isAdminUser && !isE2EUser) {
      throw new NotFoundError("Site does not exist")
    }

    logger.info(`User ${userId} has access to ${siteName}`)
  }
}
