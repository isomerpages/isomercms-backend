// Import logger
import _ from "lodash"
import { RequireAllOrNone } from "type-fest"

import { config } from "@config/config"

import logger from "@logger/logger"

// Import errors
import { AuthError } from "@errors/AuthError"

import jwtUtils from "@utils/jwt-utils"

import { SessionDataProps } from "@root/classes"
import { E2E_TEST_EMAIL, E2E_ISOMER_ID } from "@root/constants"
import { BadRequestError } from "@root/errors/BadRequestError"
import { SessionData } from "@root/types/express/session"

const E2E_TEST_REPO = config.get("cypress.e2eTestRepo")
const E2E_TEST_SECRET = config.get("cypress.e2eTestSecret")
const E2E_TEST_GH_TOKEN = config.get("cypress.e2eTestGithubToken")
const E2E_TEST_USER = "e2e-test"
const GENERAL_ACCESS_PATHS = [
  "/v1/sites",
  "/v1/auth/whoami",
  "/v2/sites",
  "/v2/auth/whoami",
]

type VerifyAccessProps = SessionData & {
  // NOTE: Either both properties are present on the cookie
  // or none are present.
  // We disallow having 1 or the other.
  cookies: RequireAllOrNone<
    {
      isomercmsE2E: string
      e2eUserType: string
    },
    "e2eUserType" | "isomercmsE2E"
  >
  url: string
}

const E2E_EMAIL_ADMIN_ISOMER_ID = "isomer-e2e-email-admin"
const E2E_EMAIL_COLLAB_ISOMER_ID = "isomer-e2e-email-collaborator"

type TestUserTypes = "Email Admin" | "Email collaborator" | "Github user"

// NOTE: Precondition to use this function is that the user type is valid.
const getUserType = (userType: string): TestUserTypes => {
  if (userType === "Email Admin") return "Email Admin"
  if (userType === "Email collaborator") return "Email collaborator"
  if (userType === "Github user") return "Github user"
  throw new Error(`Invalid user type: ${userType}`)
}

const extractE2eUserInfo = (userType: TestUserTypes): SessionDataProps => {
  switch (userType) {
    case "Email Admin":
      return {
        isomerUserId: E2E_EMAIL_ADMIN_ISOMER_ID,
        email: E2E_TEST_EMAIL,
      }
    case "Email collaborator":
      return {
        isomerUserId: E2E_EMAIL_COLLAB_ISOMER_ID,
        email: E2E_TEST_EMAIL,
      }
    case "Github user":
      return {
        accessToken: E2E_TEST_GH_TOKEN,
        githubId: E2E_TEST_USER,
        isomerUserId: E2E_ISOMER_ID,
        email: E2E_TEST_EMAIL,
      }
    default: {
      const missingUserType: never = userType
      throw new Error(`Missing user type: ${missingUserType}`)
    }
  }
}

export default class AuthenticationMiddlewareService {
  verifyE2E({
    cookies,
    url,
  }: Omit<VerifyAccessProps, "userInfo">): TestUserTypes | false {
    const { isomercmsE2E, e2eUserType } = cookies
    const urlTokens = url.split("/") // urls take the form "/v1/sites/<repo>/<path>""

    // NOTE: If the cookie is not set, this is an actual user.
    if (!isomercmsE2E) return false

    // NOTE: Cookie is set but wrong, implying someone is trying to figure out the secret
    if (isomercmsE2E !== E2E_TEST_SECRET) throw new AuthError("Bad credentials")

    if (urlTokens.length < 3) throw new BadRequestError("Invalid path")

    const userType = getUserType(e2eUserType)

    // General access paths are allowed
    if (GENERAL_ACCESS_PATHS.includes(url)) return userType

    // Throw an error if accessing a repo other than e2e-test-repo
    const repo = urlTokens[3]
    if (repo !== E2E_TEST_REPO)
      throw new AuthError(`E2E tests can only access the ${E2E_TEST_REPO} repo`)

    return userType
  }

  verifyAccess({
    cookies,
    url,
    userInfo,
  }: VerifyAccessProps): SessionDataProps {
    const e2eUserType = this.verifyE2E({ cookies, url })
    if (e2eUserType) {
      return extractE2eUserInfo(e2eUserType)
    }

    try {
      if (_.isEmpty(userInfo)) {
        const notLoggedInError = new Error("User not logged in with email")
        notLoggedInError.name = "NotLoggedInError"
        throw notLoggedInError
      }
      const {
        accessToken: retrievedToken,
        githubId,
        isomerUserId,
        email,
      } = userInfo
      const accessToken = retrievedToken
        ? jwtUtils.decryptToken(retrievedToken)
        : ""
      return { accessToken, githubId, isomerUserId, email }
    } catch (err) {
      if (!(err instanceof Error)) {
        // NOTE: If the error is of an unknown kind, we bubble it up the stack and block access.
        throw err
      }
      // NOTE: Cookies aren't being logged here because they get caught as "Object object", which is not useful
      // The cookies should be converted to a JSON struct before logging
      if (err.name === "NotLoggedInError") {
        logger.error(
          `Authentication error: user not logged in with email. Url: ${url}`
        )
        throw new AuthError(
          `Authentication error: user not logged in with email`
        )
      } else if (err.name === "TokenExpiredError") {
        logger.error(`Authentication error: JWT token expired. Url: ${url}`)
        throw new AuthError(`JWT token has expired`)
      } else {
        logger.error(
          `Authentication error. Message: ${err.message} Url: ${url}`
        )
      }
      throw err
    }
  }
}
