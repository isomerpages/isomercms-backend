import { NotFoundError } from "@errors/NotFoundError"
import { CollaboratorRoles } from "@root/constants"
import { ForbiddenError } from "@root/errors/ForbiddenError"
import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import { E2E_ISOMER_ID } from "@root/constants"
import AuthService from "@services/identity/AuthService"
import CollaboratorsService from "@services/identity/CollaboratorsService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import UsersService from "@services/identity/UsersService"

// Import logger
const logger = require("@logger/logger")

interface AuthorizationMiddlewareServiceProps {
  identityAuthService: AuthService
  usersService: UsersService
  isomerAdminsService: IsomerAdminsService
  collaboratorsService: CollaboratorsService
}

export default class AuthorizationMiddlewareService {
  readonly identityAuthService: AuthorizationMiddlewareServiceProps["identityAuthService"]

  readonly usersService: AuthorizationMiddlewareServiceProps["usersService"]

  readonly isomerAdminsService: AuthorizationMiddlewareServiceProps["isomerAdminsService"]

  readonly collaboratorsService: AuthorizationMiddlewareServiceProps["collaboratorsService"]

  constructor({
    identityAuthService,
    usersService,
    isomerAdminsService,
    collaboratorsService,
  }: AuthorizationMiddlewareServiceProps) {
    this.identityAuthService = identityAuthService
    this.usersService = usersService
    this.isomerAdminsService = isomerAdminsService
    this.collaboratorsService = collaboratorsService
  }

  async checkIsSiteMember(sessionData: UserWithSiteSessionData) {
    // Check if user has access to site
    const { siteName, isomerUserId: userId } = sessionData

    // Should always be defined - authorization middleware only exists if siteName is defined
    if (!siteName) {
      logger.error("No site name in authorization middleware")
      return new ForbiddenError()
    }

    logger.info(`Verifying user's access to ${siteName}`)

    const isSiteMember = await (sessionData.isEmailUser()
      ? (await this.collaboratorsService.getRole(siteName, userId)) !== null
      : this.identityAuthService.hasAccessToSite(sessionData))

    const isIsomerCoreAdmin = await this.isomerAdminsService.getByUserId(userId)

    const isE2EUser = userId === E2E_ISOMER_ID
    if (!isSiteMember && !isIsomerCoreAdmin && !isE2EUser) {
      logger.error("Site does not exist")
      return new ForbiddenError()
    }

    logger.info(`User ${userId} has access to ${siteName}`)
  }

  async checkIsSiteAdmin(sessionData: UserWithSiteSessionData) {
    // Check if user has access to site
    const { siteName, isomerUserId: userId } = sessionData

    // Should always be defined - authorization middleware only exists if siteName is defined
    if (!siteName) {
      logger.error("No site name in authorization middleware")
      return new ForbiddenError()
    }

    logger.info(`Verifying user's access to ${siteName}`)

    const isSiteAdmin = await (sessionData.isEmailUser()
      ? (await this.collaboratorsService.getRole(siteName, userId)) ===
        CollaboratorRoles.Admin
      : this.identityAuthService.hasAccessToSite(sessionData))
    const isIsomerCoreAdmin = await this.isomerAdminsService.getByUserId(userId)

    const isE2EUser = userId === E2E_ISOMER_ID
    if (!isSiteAdmin && !isIsomerCoreAdmin && !isE2EUser) {
      logger.error("Site does not exist")
      return new ForbiddenError()
    }

    logger.info(`User ${userId} has admin access to ${siteName}`)
  }
}
