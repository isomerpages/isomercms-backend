import UserSessionData from "@root/classes/UserSessionData"

export const mockAccessToken = "mockAccessToken"
export const mockGithubId = "mockGithubId"
export const mockIsomerUserId = "mockIsomerUserId"
export const mockEmail = "mockEmail"
export const mockTreeSha = "mockTreeSha"
export const mockCurrentCommitSha = "mockCurrentCommitSha"
export const mockSiteName = "mockSiteName"

export const mockGithubState = {
  treeSha: mockTreeSha,
  currentCommitSha: mockCurrentCommitSha,
}

export const mockSessionData = new UserSessionData({
  githubId: mockGithubId,
  accessToken: mockAccessToken,
  isomerUserId: mockIsomerUserId,
  email: mockEmail,
})
mockSessionData.addGithubState(mockGithubState)
mockSessionData.addSiteName(mockSiteName)
