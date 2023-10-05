import autoBind from "auto-bind"
import express from "express"

import { BadRequestError } from "@errors/BadRequestError"
import { ForbiddenError } from "@errors/ForbiddenError"

import { AuthorizationMiddleware } from "@middleware/authorization"
import { attachWriteRouteHandlerWrapper } from "@middleware/routeHandler"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import GitFileSystemError from "@root/errors/GitFileSystemError"
import { attachSiteHandler } from "@root/middleware"
import type { RequestHandler } from "@root/types"
import RepoManagementService from "@services/admin/RepoManagementService"

interface RepoManagementRouterProps {
  repoManagementService: RepoManagementService
  authorizationMiddleware: AuthorizationMiddleware
}

export class RepoManagementRouter {
  private readonly repoManagementService

  private readonly authorizationMiddleware

  constructor({
    repoManagementService,
    authorizationMiddleware,
  }: RepoManagementRouterProps) {
    this.repoManagementService = repoManagementService
    this.authorizationMiddleware = authorizationMiddleware
    autoBind(this)
  }

  resetRepo: RequestHandler<
    never,
    void | { message: string },
    { branchName: string; commitSha: string },
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { userWithSiteSessionData } = res.locals
    const { branchName, commitSha } = req.body

    return this.repoManagementService
      .resetRepo(userWithSiteSessionData, branchName, commitSha)
      .map(() => res.status(200).send())
      .mapErr((error) => {
        if (error instanceof BadRequestError) {
          return res.status(400).json({ message: error.message })
        }
        if (error instanceof ForbiddenError) {
          return res.status(403).json({ message: error.message })
        }
        if (error instanceof GitFileSystemError) {
          return res.status(500).json({ message: error.message })
        }
        return res.status(502).json({ message: error.message })
      })
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })
    router.use(attachSiteHandler)
    router.use(this.authorizationMiddleware.verifySiteMember)

    router.post("/resetRepo", attachWriteRouteHandlerWrapper(this.resetRepo))

    return router
  }
}
