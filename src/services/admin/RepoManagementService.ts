import { ResultAsync, errAsync } from "neverthrow"

import { BadRequestError } from "@errors/BadRequestError"
import { ForbiddenError } from "@errors/ForbiddenError"
import GitFileSystemError from "@errors/GitFileSystemError"
import GitHubApiError from "@errors/GitHubApiError"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { ISOMER_E2E_TEST_REPOS } from "@root/constants"
import RepoService from "@services/db/RepoService"

interface RepoManagementServiceProps {
  repoService: RepoService
}

class RepoManagementService {
  private readonly repoService: RepoManagementServiceProps["repoService"]

  constructor({ repoService }: RepoManagementServiceProps) {
    this.repoService = repoService
  }

  resetRepo(
    sessionData: UserWithSiteSessionData,
    branchName: string,
    commitSha: string
  ): ResultAsync<
    void,
    ForbiddenError | BadRequestError | GitFileSystemError | GitHubApiError
  > {
    const { siteName } = sessionData

    if (!ISOMER_E2E_TEST_REPOS.includes(siteName)) {
      return errAsync(new ForbiddenError(`${siteName} is not an e2e test repo`))
    }

    return ResultAsync.fromPromise(
      this.repoService.updateRepoState(sessionData, { commitSha, branchName }),
      (error) => {
        if (error instanceof BadRequestError) {
          return new BadRequestError(error.message)
        }
        if (error instanceof GitFileSystemError) {
          return new GitFileSystemError(error.message)
        }

        return new GitHubApiError(`Failed to reset repo to commit ${commitSha}`)
      }
    )
  }
}

export default RepoManagementService
