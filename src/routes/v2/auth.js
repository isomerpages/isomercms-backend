const autoBind = require("auto-bind")
const express = require("express")

const { config } = require("@config/config")

const logger = require("@logger/logger").default

// Import middleware
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const FRONTEND_URL = config.get("app.frontendUrl")
const { isSecure } = require("@utils/auth-utils")

const {
  EmailSchema,
  VerifyRequestSchema,
} = require("@root/validators/RequestSchema")

const CSRF_TOKEN_EXPIRY_MS = 600000
const CSRF_COOKIE_NAME = "isomer-csrf"
const COOKIE_NAME = "isomercms"

class AuthRouter {
  constructor({
    authService,
    authenticationMiddleware,
    statsMiddleware,
    apiLogger,
    rateLimiter,
    sgidAuthRouter,
  }) {
    this.authService = authService
    this.authenticationMiddleware = authenticationMiddleware
    this.statsMiddleware = statsMiddleware
    this.apiLogger = apiLogger
    this.rateLimiter = rateLimiter
    this.sgidAuthRouter = sgidAuthRouter
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  async clearIsomerCookies(res) {
    const cookieSettings = {
      path: "/",
    }

    res.clearCookie(COOKIE_NAME, cookieSettings)
    res.clearCookie(CSRF_COOKIE_NAME, cookieSettings)
  }

  async authRedirect(req, res) {
    const {
      redirectUrl,
      cookieToken,
    } = await this.authService.getAuthRedirectDetails()
    const csrfTokenExpiry = new Date()
    // getTime allows this to work across timezones
    csrfTokenExpiry.setTime(csrfTokenExpiry.getTime() + CSRF_TOKEN_EXPIRY_MS)
    const cookieSettings = {
      expires: csrfTokenExpiry,
      httpOnly: true,
      secure: isSecure,
    }
    res.cookie(CSRF_COOKIE_NAME, cookieToken, cookieSettings)
    return res.redirect(redirectUrl)
  }

  async githubAuth(req, res) {
    const csrfState = req.cookies[CSRF_COOKIE_NAME]
    const { code, state } = req.query

    const userInfo = await this.authService.getUserInfoFromGithubAuth({
      csrfState,
      code,
      state,
    })
    logger.info(`User ${userInfo.email} successfully logged in`)
    Object.assign(req.session, { userInfo })
    return res.redirect(`${FRONTEND_URL}/sites`)
  }

  async login(req, res) {
    const { email: rawEmail } = req.body
    const { error } = EmailSchema.validate(rawEmail)
    if (error)
      return res.status(400).json({
        message: `Invalid request format: ${error.message}`,
      })
    const email = rawEmail.toLowerCase()
    try {
      await this.authService.sendOtp(email)
    } catch (err) {
      // Log, but don't return so responses are indistinguishable
      logger.error(
        `Error occurred when attempting to login user ${email}: ${err}`
      )
    }
    return res.sendStatus(200)
  }

  async verify(req, res) {
    const { email: rawEmail, otp } = req.body
    const { error } = VerifyRequestSchema.validate(req.body)
    if (error)
      return res.status(400).json({
        message: `Invalid request format: ${error.message}`,
      })
    const email = rawEmail.toLowerCase()
    const userInfo = (await this.authService.verifyOtp({ email, otp })).value
    Object.assign(req.session, { userInfo })
    logger.info(`User ${userInfo.email} successfully logged in`)
    return res.sendStatus(200)
  }

  async logout(req, res) {
    this.clearIsomerCookies(res)
    req.session.destroy()
    return res.sendStatus(200)
  }

  async whoami(req, res) {
    const { userSessionData } = res.locals

    const userInfo = await this.authService.getUserInfo(userSessionData)
    if (!userInfo) {
      this.clearIsomerCookies(res)
      req.session.destroy()
      return res.sendStatus(401)
    }
    return res.status(200).json(userInfo)
  }

  getRouter() {
    const router = express.Router()
    router.use(this.apiLogger)

    router.use(this.rateLimiter)
    router.use("/sgid", this.sgidAuthRouter.getRouter())
    router.get(
      "/github-redirect",
      attachReadRouteHandlerWrapper(this.authRedirect)
    )
    router.get(
      "/",
      this.statsMiddleware.trackV2GithubLogins,
      attachReadRouteHandlerWrapper(this.githubAuth)
    )
    router.post("/login", attachReadRouteHandlerWrapper(this.login))
    router.post(
      "/verify",
      this.statsMiddleware.trackEmailLogins,
      attachReadRouteHandlerWrapper(this.verify)
    )
    router.delete("/logout", attachReadRouteHandlerWrapper(this.logout))
    router.get(
      "/whoami",
      this.authenticationMiddleware.verifyAccess,
      this.statsMiddleware.countDbUsers,
      attachReadRouteHandlerWrapper(this.whoami)
    )

    return router
  }
}

module.exports = { AuthRouter, CSRF_COOKIE_NAME, COOKIE_NAME }
