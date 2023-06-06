import jwtUtil from "@utils/jwt-utils"

import config from "@root/config/config"
import { E2E_ISOMER_ID, E2E_TEST_EMAIL } from "@root/constants"
import { AuthError } from "@root/errors/AuthError"

import AuthenticationMiddlewareService, {
  E2E_EMAIL_TEST_SITE,
  E2E_TEST_GH_TOKEN,
  E2E_TEST_REPO,
  E2E_TEST_USER,
  VerifyAccessProps,
} from "../AuthenticationMiddlewareService"

const authenticationMiddlewareService = new AuthenticationMiddlewareService()

const E2E_GITHUB_REPO_URL = `/v1/sites/${E2E_TEST_REPO}`
const E2E_EMAIL_REPO_URL = `/v1/sites/${E2E_EMAIL_TEST_SITE.repo}`

const E2E_EMAIL_ADMIN_ISOMER_ID = "1"
const E2E_EMAIL_COLLAB_ISOMER_ID = "2"

const MOCK_GITHUB_USER_PROPS: VerifyAccessProps = {
  // NOTE: Actual users won't have cookies - instead, they will use our session
  cookies: {},
  userInfo: {
    githubId: "MOCK_GITHUB_USER",
    accessToken: "MOCK_ACCESS_TOKEN",
    isomerUserId: "1",
    email: "",
  },
  url: "",
}

const E2E_GITHUB_USER_PROPS: VerifyAccessProps = {
  // NOTE: Actual users won't have cookies - instead, they will use our session
  cookies: {
    isomercmsE2E: config.get("cypress.e2eTestSecret"),
    e2eUserType: "Github user",
    site: "",
    email: "",
  },
  userInfo: {
    githubId: "MOCK_E2E_USER",
    accessToken: "MOCK_ACCESS_TOKEN",
    isomerUserId: E2E_ISOMER_ID,
    email: "MOCK@TEST.GOV.SG",
  },
  url: E2E_GITHUB_REPO_URL,
}

const E2E_EMAIL_COLLAB_PROPS: VerifyAccessProps = {
  // NOTE: Actual users won't have cookies - instead, they will use our session
  cookies: {
    isomercmsE2E: config.get("cypress.e2eTestSecret"),
    e2eUserType: "Email collaborator",
    site: "",
    email: "",
  },
  userInfo: {
    // NOTE: email users won't have github related fields
    isomerUserId: E2E_EMAIL_COLLAB_ISOMER_ID,
    email: "MOCK@TEST.GOV.SG",
  },
  url: E2E_EMAIL_REPO_URL,
}

const E2E_EMAIL_ADMIN_PROPS: VerifyAccessProps = {
  // NOTE: Actual users won't have cookies - instead, they will use our session
  cookies: {
    isomercmsE2E: config.get("cypress.e2eTestSecret"),
    e2eUserType: "Email admin",
    site: "",
    email: "",
  },
  userInfo: {
    // NOTE: email users won't have github related fields
    isomerUserId: E2E_EMAIL_ADMIN_ISOMER_ID,
    email: "MOCK@TEST.GOV.SG",
  },
  url: E2E_EMAIL_REPO_URL,
}

const injectUrl = (
  user: VerifyAccessProps,
  url?: string
): VerifyAccessProps => {
  if (url) return { ...user, url }
  return user
}

const getMockUserByType = (
  type: "email admin" | "github" | "email collab"
): VerifyAccessProps => {
  switch (type) {
    case "email admin":
      return E2E_EMAIL_ADMIN_PROPS
    case "github":
      return E2E_GITHUB_USER_PROPS
    case "email collab":
      return E2E_EMAIL_COLLAB_PROPS
    default: {
      const err: never = type
      throw new Error(`Unknown type ${err}`)
    }
  }
}

const getMockUser = (
  e2eType: "email admin" | "github" | "email collab",
  url?: string
): VerifyAccessProps => injectUrl(getMockUserByType(e2eType), url)

describe("AuthenticationMiddlewareService", () => {
  describe("e2e user access verification", () => {
    it("should verify e2e github users successfully when the url is for e2e github test repo", () => {
      // Arrange
      const expected = {
        accessToken: E2E_TEST_GH_TOKEN,
        githubId: E2E_TEST_USER,
        isomerUserId: E2E_ISOMER_ID,
        email: E2E_TEST_EMAIL,
      }

      // Act
      const actual = authenticationMiddlewareService.verifyAccess(
        E2E_GITHUB_USER_PROPS
      )

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should verify e2e email collab successfully when the url is for the e2e email test repo", () => {
      // Arrange
      // NOTE: Email users lack access token/github id.
      // This is injected Isomer's github access tokens.
      const expected = {
        isomerUserId: E2E_EMAIL_COLLAB_PROPS.userInfo?.isomerUserId,
        email: E2E_TEST_EMAIL,
      }

      // Act
      const actual = authenticationMiddlewareService.verifyAccess(
        E2E_EMAIL_COLLAB_PROPS
      )

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should verify e2e email admin successfully when the url is for the e2e email test repo", () => {
      // Arrange
      // NOTE: Email users lack access token/github id.
      // This is injected Isomer's github access tokens.
      const expected = {
        isomerUserId: E2E_EMAIL_ADMIN_PROPS.userInfo?.isomerUserId,
        email: E2E_TEST_EMAIL,
      }

      // Act
      const actual = authenticationMiddlewareService.verifyAccess(
        E2E_EMAIL_ADMIN_PROPS
      )

      // Assert
      expect(actual).toEqual(expected)
    })

    it("should throw an error when github e2e user tries to access a non-e2e repo", () => {
      // Arrange
      const props = getMockUser("github", `/v1/sites/some-repo`)

      // Act
      // NOTE: Have to do this cos it should throw
      const run = () => authenticationMiddlewareService.verifyAccess(props)

      // Assert
      expect(run).toThrowError(AuthError)
    })

    it("should throw an error when email e2e admin tries to access a non-e2e repo", () => {
      // Arrange
      const props = getMockUser("email admin", `/v1/sites/some-repo`)

      // Act
      // NOTE: Have to do this cos it should throw
      const run = () => authenticationMiddlewareService.verifyAccess(props)

      // Assert
      expect(run).toThrowError(AuthError)
    })

    it("should throw an error when email e2e collab tries to access a non-e2e repo", () => {
      // Arrange
      const props = getMockUser("email collab", `/v1/sites/some-repo`)

      // Act
      // NOTE: Have to do this cos it should throw
      const run = () => authenticationMiddlewareService.verifyAccess(props)

      // Assert
      expect(run).toThrowError(AuthError)
    })

    it("should throw an error when github e2e user tries to access email e2e repo", async () => {
      // Arrange
      const props = getMockUser("github", E2E_EMAIL_REPO_URL)

      // Act
      // NOTE: Have to do this cos it should throw
      const run = () => authenticationMiddlewareService.verifyAccess(props)

      // Assert
      expect(run).toThrowError(AuthError)
    })

    it("should throw an error when email e2e collab tries to access github e2e repo", async () => {
      // Arrange
      const props = getMockUser("email collab", E2E_GITHUB_REPO_URL)

      // Act
      // NOTE: Have to do this cos it should throw
      const run = () => authenticationMiddlewareService.verifyAccess(props)

      // Assert
      expect(run).toThrowError(AuthError)
    })

    it("should throw an error when email e2e admin tries to access github e2e repo", async () => {
      // Arrange
      const props = getMockUser("email admin", E2E_GITHUB_REPO_URL)

      // Act
      // NOTE: Have to do this cos it should throw
      const run = () => authenticationMiddlewareService.verifyAccess(props)

      // Assert
      expect(run).toThrowError(AuthError)
    })
  })

  describe("github user access verification", () => {
    it("should verify github user successfully when the url is for a valid repo", () => {
      // Arrange
      const expected = MOCK_GITHUB_USER_PROPS.userInfo
      const decryptSpy = jest.spyOn(jwtUtil, "decryptToken")
      decryptSpy.mockReturnValueOnce(
        MOCK_GITHUB_USER_PROPS.userInfo?.accessToken
      )

      // Act
      const actual = authenticationMiddlewareService.verifyAccess(
        MOCK_GITHUB_USER_PROPS
      )

      // Assert
      expect(actual).toEqual(expected)
      expect(decryptSpy).toBeCalledWith(
        MOCK_GITHUB_USER_PROPS.userInfo?.accessToken
      )
    })

    it("should throw an error when the user info is empty", () => {
      // Arrange
      const missingUserInfo = { ...MOCK_GITHUB_USER_PROPS, userInfo: {} }
      const err = new Error(
        "Authentication error: user not logged in with email"
      )
      err.name = "NotLoggedInError"

      // Act
      const run = () =>
        authenticationMiddlewareService.verifyAccess(missingUserInfo)

      // Assert
      expect(run).toThrowError(err)
    })
  })
})
