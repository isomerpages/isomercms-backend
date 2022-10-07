import autoBind from "auto-bind"
import express from "express"

import { AuthorizationMiddleware } from "@middleware/authorization"
import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import { BaseIsomerError } from "@root/errors/BaseError"
import { attachSiteHandler } from "@root/middleware"
import { RequestHandler } from "@root/types"
import { UserDto } from "@root/types/dto /review"
import CollaboratorsService from "@services/identity/CollaboratorsService"

interface CollaboratorsRouterProps {
  collaboratorsService: CollaboratorsService
  authorizationMiddleware: AuthorizationMiddleware
}

// eslint-disable-next-line import/prefer-default-export
export class CollaboratorsRouter {
  private readonly collaboratorsService

  private readonly authorizationMiddleware

  constructor({
    collaboratorsService,
    authorizationMiddleware,
  }: CollaboratorsRouterProps) {
    this.collaboratorsService = collaboratorsService
    this.authorizationMiddleware = authorizationMiddleware
    autoBind(this)
  }

  createCollaborator: RequestHandler<
    never,
    unknown,
    { email: string; acknowledge?: boolean },
    { siteName: string },
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { email, acknowledge = false } = req.body
    const { siteName } = req.params
    const resp = await this.collaboratorsService.create(
      siteName,
      email,
      acknowledge
    )

    // Check for error and throw
    if (resp instanceof BaseIsomerError) {
      throw resp
    }
    return res.sendStatus(200)
  }

  deleteCollaborator: RequestHandler<
    never,
    unknown,
    never,
    { siteName: string; userId: string },
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { siteName, userId } = req.params
    const resp = await this.collaboratorsService.delete(siteName, userId)

    // Check for error and throw
    if (resp instanceof BaseIsomerError) {
      throw resp
    }
    return res.sendStatus(200)
  }

  listCollaborators: RequestHandler<
    { siteName: string },
    { collaborators: UserDto[] },
    never,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { siteName } = req.params
    const { userWithSiteSessionData } = res.locals
    const rawCollaborators = await this.collaboratorsService.list(
      siteName,
      userWithSiteSessionData.isomerUserId
    )
    const collaborators = rawCollaborators.map((collaborator) => ({
      ...collaborator.toJSON(),
      email: collaborator.email || "",
      role: collaborator.SiteMember.role,
    }))

    return res.status(200).json({ collaborators })
  }

  getCollaboratorRole: RequestHandler<
    never,
    unknown,
    never,
    { siteName: string },
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { siteName } = req.params
    const { userWithSiteSessionData } = res.locals
    const role = await this.collaboratorsService.getRole(
      siteName,
      userWithSiteSessionData.isomerUserId
    )
    return res.status(200).json({ role })
  }

  getCollaboratorsStatistics: RequestHandler<
    { siteName: string },
    unknown,
    never,
    never,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { siteName } = req.params
    const statistics = await this.collaboratorsService.getStatistics(siteName)

    // Check for error and throw
    if (statistics instanceof BaseIsomerError) {
      return res.status(404).json({ message: statistics.message })
    }
    return res.status(200).json(statistics)
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })
    router.get(
      "/role",
      attachSiteHandler,
      this.authorizationMiddleware.verifySiteMember,
      attachReadRouteHandlerWrapper(this.getCollaboratorRole)
    )
    router.get(
      "/",
      attachSiteHandler,
      this.authorizationMiddleware.verifySiteMember,
      attachReadRouteHandlerWrapper(this.listCollaborators)
    )
    router.post(
      "/",
      attachSiteHandler,
      this.authorizationMiddleware.verifySiteAdmin,
      attachReadRouteHandlerWrapper(this.createCollaborator)
    )
    router.delete(
      "/:userId",
      attachSiteHandler,
      this.authorizationMiddleware.verifySiteAdmin,
      attachReadRouteHandlerWrapper(this.deleteCollaborator)
    )
    router.get(
      "/statistics",
      attachSiteHandler,
      this.authorizationMiddleware.verifySiteMember,
      attachReadRouteHandlerWrapper(this.getCollaboratorsStatistics)
    )

    return router
  }
}
