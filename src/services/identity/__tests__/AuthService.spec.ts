import { BadRequestError } from "@errors/BadRequestError"
import { NotFoundError } from "@errors/NotFoundError"

import { mockUserWithSiteSessionData } from "@fixtures/sessionData"
import { GitHubService } from "@services/db/GitHubService"

import _AuthService from "../AuthService"

const mockGitHubService = {
  checkHasAccess: jest.fn(),
}
const AuthService = new _AuthService({
  gitHubService: (mockGitHubService as unknown) as GitHubService,
})

describe("Auth Service", () => {
  it("should call axios successfully and return true when the call is successful", async () => {
    // Arrange
    const expected = true

    // Act
    const actual = await AuthService.hasAccessToSite(
      mockUserWithSiteSessionData
    )

    // Assert
    expect(actual).toBe(expected)
    expect(mockGitHubService.checkHasAccess).toHaveBeenCalledWith(
      mockUserWithSiteSessionData
    )
  })

  it("should call axios successfully and return false when the call fails with 403", async () => {
    // Arrange
    const expected = false
    mockGitHubService.checkHasAccess.mockRejectedValueOnce(
      new NotFoundError("")
    )

    // Act
    const actual = await AuthService.hasAccessToSite(
      mockUserWithSiteSessionData
    )

    // Assert
    expect(actual).toBe(expected)
    expect(mockGitHubService.checkHasAccess).toHaveBeenCalledWith(
      mockUserWithSiteSessionData
    )
  })

  it("should call axios successfully and bubble the error when the status is not 403 or 404", async () => {
    // Arrange
    mockGitHubService.checkHasAccess.mockRejectedValueOnce(
      new BadRequestError()
    )

    // Act
    const actual = AuthService.hasAccessToSite(mockUserWithSiteSessionData)

    // Assert
    await expect(actual).rejects.toThrow(BadRequestError)
    expect(mockGitHubService.checkHasAccess).toHaveBeenCalledWith(
      mockUserWithSiteSessionData
    )
  })
})
