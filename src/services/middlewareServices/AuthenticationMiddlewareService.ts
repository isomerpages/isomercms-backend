// Import logger
import _ from "lodash"

import { config } from "@config/config"

import logger from "@logger/logger"

// Import errors
import { AuthError } from "@errors/AuthError"

import jwtUtils from "@utils/jwt-utils"

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
  cookies: {
    isomercms: string
    isomercmsE2E?: string
  }
  url: string
}

export default class AuthenticationMiddlewareService {
  verifyE2E({ cookies, url }: Omit<VerifyAccessProps, "userInfo">) {
    const { isomercmsE2E } = cookies
    const urlTokens = url.split("/") // urls take the form "/v1/sites/<repo>/<path>""

    if (!isomercmsE2E) return false

    if (isomercmsE2E !== E2E_TEST_SECRET) throw new AuthError("Bad credentials")

    if (urlTokens.length < 3) throw new BadRequestError("Invalid path")

    // General access paths are allowed
    if (GENERAL_ACCESS_PATHS.includes(url)) return true

    // Throw an error if accessing a repo other than e2e-test-repo
    const repo = urlTokens[3]
    if (repo !== E2E_TEST_REPO)
      throw new AuthError(`E2E tests can only access the ${E2E_TEST_REPO} repo`)

    return true
  }

  verifyAccess({ cookies, url, userInfo }: VerifyAccessProps) {
    const isValidE2E = this.verifyE2E({ cookies, url })

    if (isValidE2E) {
      const accessToken = E2E_TEST_GH_TOKEN
      const githubId = E2E_TEST_USER
      const isomerUserId = E2E_ISOMER_ID
      const email = E2E_TEST_EMAIL
      return { accessToken, githubId, isomerUserId, email }
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
