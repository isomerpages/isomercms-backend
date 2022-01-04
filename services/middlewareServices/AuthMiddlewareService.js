// Import logger
const logger = require("@logger/logger")

// Import errors
const { AuthError } = require("@errors/AuthError")

const jwtUtils = require("@utils/jwt-utils")

const { BadRequestError } = require("@root/errors/BadRequestError")

const { E2E_TEST_REPO, E2E_TEST_SECRET, E2E_TEST_GH_TOKEN } = process.env
const E2E_TEST_USER = "e2e-test"
const GENERAL_ACCESS_PATHS = ["/v1/sites", "/v1/auth/whoami"]

class AuthMiddlewareService {
  verifyE2E({ cookies, url }) {
    const { isomercmsE2E } = cookies
    const urlTokens = url.split("/") // urls take the form "/v1/sites/<repo>/<path>""
    let isValidE2E

    if (isomercmsE2E) {
      if (isomercmsE2E !== E2E_TEST_SECRET)
        throw new AuthError("Bad credentials")

      // Throw an error if accessing a repo other than e2e-test-repo
      // Otherwise, allow access only to paths available to all users
      if (!GENERAL_ACCESS_PATHS.includes(url)) {
        if (urlTokens.length >= 3) {
          const repo = urlTokens[3]
          if (repo !== E2E_TEST_REPO)
            throw new AuthError(
              `E2E tests can only access the ${E2E_TEST_REPO} repo`
            )
        } else {
          throw new BadRequestError("Invalid path")
        }
      }

      isValidE2E = true
    }

    return isValidE2E
  }

  verifyJwt({ cookies, url }) {
    const { isomercms } = cookies
    const isValidE2E = this.verifyE2E({ cookies, url })

    let accessToken
    let userId
    if (isValidE2E) {
      accessToken = E2E_TEST_GH_TOKEN
      userId = E2E_TEST_USER
    } else {
      try {
        const {
          access_token: retrievedToken,
          user_id: retrievedId,
        } = jwtUtils.verifyToken(isomercms)
        accessToken = jwtUtils.decryptToken(retrievedToken)
        userId = retrievedId
      } catch (err) {
        logger.error("Authentication error")
        if (err.name === "TokenExpiredError") {
          throw new AuthError("JWT token has expired")
        }
        if (err.name === "JsonWebTokenError") {
          throw new AuthError(err.message)
        }
        throw new Error(err)
      }
    }
    return { accessToken, userId }
  }

  whoamiAuth({ cookies, url }) {
    const isValidE2E = this.verifyE2E({ cookies, url })

    let accessToken
    let userId
    if (isValidE2E) {
      accessToken = E2E_TEST_GH_TOKEN
      userId = E2E_TEST_USER
    } else {
      let retrievedToken
      try {
        const { isomercms } = cookies
        const { access_token: verifiedToken } = jwtUtils.verifyToken(isomercms)
        retrievedToken = jwtUtils.decryptToken(verifiedToken)
      } catch (err) {
        retrievedToken = undefined
      } finally {
        accessToken = retrievedToken
      }
    }
    return { accessToken, userId }
  }
}

module.exports = {
  AuthMiddlewareService,
}
