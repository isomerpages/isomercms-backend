import { NotFoundError } from "@errors/NotFoundError"

import SessionData from "@classes/SessionData"

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

  async checkIsSiteMember(sessionData: SessionData) {
    // Check if user has access to site
    const siteName = sessionData.getSiteName()
    const userId = sessionData.getIsomerUserId()

    // Should always be defined - authorization middleware only exists if siteName is defined
    if (!siteName) throw Error("No site name in authorization middleware")

    logger.info(`Verifying user's access to ${siteName}`)

    let isSiteMember = false
    if (sessionData.getIsEmailUser()) {
      isSiteMember = await this.usersService.hasAccessToSite(userId, siteName)
    } else {
      isSiteMember = await this.identityAuthService.hasAccessToSite(sessionData)
    }

    const isAdminUser = await this.isomerAdminsService.getByUserId(userId)

    const isE2EUser = userId === E2E_ISOMER_ID
    if (!isSiteMember && !isAdminUser && !isE2EUser) {
      throw new NotFoundError("Site does not exist")
    }

    logger.info(`User ${userId} has access to ${siteName}`)
  }
}
