import { ForbiddenError } from "@errors/ForbiddenError"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { ISOMER_E2E_TEST_REPOS } from "@root/constants"
import _RepoManagementService from "@services/admin/RepoManagementService"
import RepoService from "@services/db/RepoService"

const MockRepoService = {
  updateRepoState: jest.fn(),
}

const RepoManagementService = new _RepoManagementService({
  repoService: (MockRepoService as unknown) as RepoService,
})

describe("RepoManagementService", () => {
  // Prevent inter-test pollution of mocks
  afterEach(() => jest.clearAllMocks())

  describe("resetRepo", () => {
    it("should reset an e2e test repo successfully", async () => {
      const mockSessionData = new UserWithSiteSessionData({
        githubId: "githubId",
        accessToken: "accessToken",
        isomerUserId: "isomerUserId",
        email: "email",
        siteName: ISOMER_E2E_TEST_REPOS[0],
      })
      MockRepoService.updateRepoState.mockResolvedValueOnce(undefined)

      await RepoManagementService.resetRepo(
        mockSessionData,
        "branchName",
        "commitSha"
      )

      expect(MockRepoService.updateRepoState).toHaveBeenCalledTimes(1)
    })

    it("should not reset a non-e2e test repo", async () => {
      const mockSessionData = new UserWithSiteSessionData({
        githubId: "githubId",
        accessToken: "accessToken",
        isomerUserId: "isomerUserId",
        email: "email",
        siteName: "some-other-site",
      })

      const result = await RepoManagementService.resetRepo(
        mockSessionData,
        "branchName",
        "commitSha"
      )

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError)
      expect(MockRepoService.updateRepoState).toHaveBeenCalledTimes(0)
    })
  })
})
