import GithubSessionData from "@root/classes/GithubSessionData"
import UserSessionData from "@root/classes/UserSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"

import {
  MOCK_USER_EMAIL_ONE,
  MOCK_USER_EMAIL_TWO,
  MOCK_USER_EMAIL_THREE,
  MOCK_USER_EMAIL_FOUR,
  MOCK_USER_ID_ONE,
  MOCK_USER_ID_TWO,
  MOCK_USER_ID_THREE,
  MOCK_USER_ID_FOUR,
} from "./users"

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

export const MOCK_USER_SESSION_DATA_ONE = new UserSessionData({
  isomerUserId: String(MOCK_USER_ID_ONE),
  email: MOCK_USER_EMAIL_ONE,
})
export const MOCK_USER_SESSION_DATA_TWO = new UserSessionData({
  isomerUserId: String(MOCK_USER_ID_TWO),
  email: MOCK_USER_EMAIL_TWO,
})
export const MOCK_USER_SESSION_DATA_THREE = new UserSessionData({
  isomerUserId: String(MOCK_USER_ID_THREE),
  email: MOCK_USER_EMAIL_THREE,
})
export const MOCK_USER_SESSION_DATA_FOUR = new UserSessionData({
  isomerUserId: String(MOCK_USER_ID_FOUR),
  email: MOCK_USER_EMAIL_FOUR,
})
