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

  verifyJwt({ cookies, url }) {
    const { isomercms } = cookies
    const isValidE2E = this.verifyE2E({ cookies, url })

    if (isValidE2E) {
      const accessToken = E2E_TEST_GH_TOKEN
      const userId = E2E_TEST_USER
      return { accessToken, userId }
    }
    try {
      const {
        access_token: retrievedToken,
        user_id: retrievedId,
      } = jwtUtils.verifyToken(isomercms)
      const accessToken = jwtUtils.decryptToken(retrievedToken)
      const userId = retrievedId
      return { accessToken, userId }
    } catch (err) {
      logger.error("Authentication error")
      if (err.name === "TokenExpiredError") {
        throw new AuthError(`JWT token has expired`)
      }
      if (err.name === "JsonWebTokenError") {
        throw new AuthError(
          `Encountered an auth error at ${url}: ${err.message}`
        )
      }
      throw err
    }
  }

  whoamiAuth({ cookies, url }) {
    const isValidE2E = this.verifyE2E({ cookies, url })

    if (isValidE2E) {
      const accessToken = E2E_TEST_GH_TOKEN
      const userId = E2E_TEST_USER
      return { accessToken, userId }
    }
    try {
      const { isomercms } = cookies
      const { access_token: verifiedToken } = jwtUtils.verifyToken(isomercms)
      const accessToken = jwtUtils.decryptToken(verifiedToken)
      return { accessToken, userId: undefined }
    } catch (err) {
      return { accessToken: undefined, userId: undefined }
    }
  }
}

module.exports = {
  AuthMiddlewareService,
}
