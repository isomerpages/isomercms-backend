import { NotFoundError } from "@errors/NotFoundError"

import SessionData from "@classes/SessionData"

import { GitHubService } from "@services/db/GitHubService"

interface AuthServiceProps {
  gitHubService: GitHubService
}

class AuthService {
  // NOTE: This should never be assigned to outside of constructor, hence use readonly
  readonly gitHubService: GitHubService

  constructor({ gitHubService }: AuthServiceProps) {
    this.gitHubService = gitHubService
  }

  async hasAccessToSite(sessionData: SessionData): Promise<boolean> {
    try {
      await this.gitHubService.checkHasAccess(sessionData)
      return true
    } catch (err) {
      if (err instanceof NotFoundError) {
        return false
      }
      // NOTE: If the error is of an unknown kind, we bubble it up the stack and block access.
      throw err
    }
  }
}

export default AuthService
