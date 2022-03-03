// Import logger
const logger = require("@logger/logger")

// Import errors
const { AuthError } = require("@errors/AuthError")
const { NotFoundError } = require("@errors/NotFoundError")

const jwtUtils = require("@utils/jwt-utils")

const { BadRequestError } = require("@root/errors/BadRequestError")

// Import services
const identityServices = require("@services/identity")

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
        isomer_user_id: isomerUserId,
      } = jwtUtils.verifyToken(isomercms)
      if (!isomerUserId) {
        const notLoggedInError = new Error("User not logged in with email")
        notLoggedInError.name = "NotLoggedInError"
        throw notLoggedInError
      }
      const accessToken = jwtUtils.decryptToken(retrievedToken)
      const userId = retrievedId
      return { accessToken, userId }
    } catch (err) {
      logger.error("Authentication error")
      if (err.name === "NotLoggedInError") {
        throw new AuthError(
          `Encountered an auth error at ${url}: ${err.message}`
        )
      }
      if (err.name === "TokenExpiredError") {
        throw new AuthError(`JWT token has expired`)
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
      if (!verifiedToken) throw new Error("Invalid token")
      const accessToken = jwtUtils.decryptToken(verifiedToken)
      return { accessToken, userId: undefined }
    } catch (err) {
      return { accessToken: undefined, userId: undefined }
    }
  }

  async retrieveSiteAccessTokenIfAvailable({
    siteName,
    userAccessToken,
    userId,
  }) {
    const { authService, sitesService } = identityServices

    // Check if site is onboarded to Isomer identity, otherwise continue using user access token
    const site = await sitesService.getBySiteName(siteName)
    if (!site) {
      logger.info(
        `Site ${siteName} does not exist in site table. Default to using user access token.`
      )
      return undefined
    }

    logger.info(`Verifying user's access to ${siteName}`)
    if (
      !(await authService.hasAccessToSite(
        { accessToken: userAccessToken, siteName },
        { userId }
      ))
    ) {
      throw new NotFoundError("Site does not exist")
    }

    const siteAccessToken = await sitesService.getSiteAccessToken(siteName)
    logger.info(
      `User ${userId} has access to ${siteName}. Using site access token ${site.apiTokenName}.`
    )
    return siteAccessToken
  }
}

module.exports = {
  AuthMiddlewareService,
}
