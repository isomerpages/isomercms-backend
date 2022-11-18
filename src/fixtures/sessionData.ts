import GithubSessionData from "@root/classes/GithubSessionData"
import UserSessionData from "@root/classes/UserSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"

export const mockAccessToken = "mockAccessToken"
export const mockGithubId = "mockGithubId"
export const mockIsomerUserId = "1"
export const mockEmail = "mockEmail"
export const mockTreeSha = "mockTreeSha"
export const mockCurrentCommitSha = "mockCurrentCommitSha"
export const mockSiteName = "mockSiteName"

export const mockGithubState = {
  treeSha: mockTreeSha,
  currentCommitSha: mockCurrentCommitSha,
}

export const mockUserSessionData = new UserSessionData({
  githubId: mockGithubId,
  accessToken: mockAccessToken,
  isomerUserId: mockIsomerUserId,
  email: mockEmail,
})

export const mockUserWithSiteSessionData = new UserWithSiteSessionData({
  githubId: mockGithubId,
  accessToken: mockAccessToken,
  isomerUserId: mockIsomerUserId,
  email: mockEmail,
  siteName: mockSiteName,
})

export const mockGithubSessionData = new GithubSessionData({
  treeSha: mockTreeSha,
  currentCommitSha: mockCurrentCommitSha,
})
export const mockSessionDataEmailUser = new UserSessionData({
  isomerUserId: mockIsomerUserId,
  email: mockEmail,
})
export const mockSessionDataEmailUserWithSite = new UserWithSiteSessionData({
  isomerUserId: mockIsomerUserId,
  email: mockEmail,
  siteName: mockSiteName,
})
