import express from "express"
import { errAsync, okAsync } from "neverthrow"
import request from "supertest"

import { BadRequestError } from "@errors/BadRequestError"
import { ForbiddenError } from "@errors/ForbiddenError"
import GitFileSystemError from "@errors/GitFileSystemError"
import GitHubApiError from "@errors/GitHubApiError"

import { AuthorizationMiddleware } from "@middleware/authorization"
import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import {
  generateRouter,
  generateRouterForDefaultUserWithSite,
} from "@fixtures/app"
import RepoManagementService from "@services/admin/RepoManagementService"

import { RepoManagementRouter } from "../repoManagement"

describe("RepoManagementRouter", () => {
  const mockRepoManagementService = {
    resetRepo: jest.fn(),
  }

  const mockAuthorizationMiddleware = {
    verifySiteAdmin: jest.fn(),
  }

  const router = new RepoManagementRouter({
    repoManagementService: (mockRepoManagementService as unknown) as RepoManagementService,
    authorizationMiddleware: (mockAuthorizationMiddleware as unknown) as AuthorizationMiddleware,
  })

  const subrouter = express()
  // We can use read route handler here because we don't need to lock the repo
  subrouter.post("/resetRepo", attachReadRouteHandlerWrapper(router.resetRepo))

  const app = generateRouter(subrouter)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("resetRepo", () => {
    it("should return 200 if repo was successfully reset", async () => {
      mockRepoManagementService.resetRepo.mockReturnValueOnce(
        okAsync(undefined)
      )

      const response = await request(app).post("/resetRepo").send({
        branchName: "branch-name",
        commitSha: "commit-sha",
      })

      expect(response.status).toBe(200)
      expect(mockRepoManagementService.resetRepo).toHaveBeenCalledTimes(1)
    })

    it("should return 400 if a BadRequestError is received", async () => {
      mockRepoManagementService.resetRepo.mockReturnValueOnce(
        errAsync(new BadRequestError("error"))
      )

      const response = await request(app).post("/resetRepo").send({
        branchName: "branch-name",
        commitSha: "commit-sha",
      })

      expect(response.status).toBe(400)
      expect(mockRepoManagementService.resetRepo).toHaveBeenCalledTimes(1)
    })

    it("should return 403 if a ForbiddenError is received", async () => {
      mockRepoManagementService.resetRepo.mockReturnValueOnce(
        errAsync(new ForbiddenError())
      )

      const response = await request(app).post("/resetRepo").send({
        branchName: "branch-name",
        commitSha: "commit-sha",
      })

      expect(response.status).toBe(403)
      expect(mockRepoManagementService.resetRepo).toHaveBeenCalledTimes(1)
    })

    it("should return 500 if a GitFileSystemError is received", async () => {
      mockRepoManagementService.resetRepo.mockReturnValueOnce(
        errAsync(new GitFileSystemError("error"))
      )

      const response = await request(app).post("/resetRepo").send({
        branchName: "branch-name",
        commitSha: "commit-sha",
      })

      expect(response.status).toBe(500)
      expect(mockRepoManagementService.resetRepo).toHaveBeenCalledTimes(1)
    })

    it("should return 502 if a GitHubApiError error is received", async () => {
      mockRepoManagementService.resetRepo.mockReturnValueOnce(
        errAsync(new GitHubApiError("error"))
      )

      const response = await request(app).post("/resetRepo").send({
        branchName: "branch-name",
        commitSha: "commit-sha",
      })

      expect(response.status).toBe(502)
      expect(mockRepoManagementService.resetRepo).toHaveBeenCalledTimes(1)
    })
  })
})
