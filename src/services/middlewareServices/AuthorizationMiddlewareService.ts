import logger from "@logger/logger"

import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import { CollaboratorRoles, E2E_ISOMER_ID } from "@root/constants"
import { ForbiddenError } from "@root/errors/ForbiddenError"
import AuthService from "@services/identity/AuthService"
import CollaboratorsService from "@services/identity/CollaboratorsService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import UsersService from "@services/identity/UsersService"

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

  async doesUserHaveCollaboratorLevelAccess(
    siteName: string,
    userId: string,
    collaboratorType: CollaboratorRoles
  ) {
    const collaboratorRole = await this.collaboratorsService.getRole(
      siteName,
      userId
    )
    return collaboratorType === CollaboratorRoles.Admin
      ? collaboratorRole === CollaboratorRoles.Admin
      : collaboratorRole === CollaboratorRoles.Admin ||
          collaboratorRole === CollaboratorRoles.Contributor
  }

  async checkIsSiteCollaborator(
    sessionData: UserWithSiteSessionData,
    collaboratorType: CollaboratorRoles
  ) {
    // Check if user has access to site
    const { siteName, isomerUserId: userId } = sessionData

    // Should always be defined - authorization middleware only exists if siteName is defined
    if (!siteName) {
      logger.error("No site name in authorization middleware")
      return new ForbiddenError()
    }

    logger.info(`Verifying user's access to ${siteName}`)
    const isSiteCollaboratorOfType = sessionData.isEmailUser()
      ? await this.doesUserHaveCollaboratorLevelAccess(
          siteName,
          userId,
          collaboratorType
        )
      : await this.identityAuthService.hasAccessToSite(sessionData)
    const isIsomerCoreAdmin = await this.isomerAdminsService.getByUserId(userId)

    const isE2EUser = userId === E2E_ISOMER_ID
    if (!isSiteCollaboratorOfType && !isIsomerCoreAdmin && !isE2EUser) {
      logger.error("Site does not exist")
      return new ForbiddenError()
    }

    logger.info(
      `User ${sessionData.isomerUserId} has ${collaboratorType} access to ${sessionData.siteName}`
    )
  }

  async checkIsSiteMember(sessionData: UserWithSiteSessionData) {
    return this.checkIsSiteCollaborator(
      sessionData,
      CollaboratorRoles.Contributor
    )
  }

  async checkIsSiteAdmin(sessionData: UserWithSiteSessionData) {
    return this.checkIsSiteCollaborator(sessionData, CollaboratorRoles.Admin)
  }
}
