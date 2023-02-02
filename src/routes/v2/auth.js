const autoBind = require("auto-bind")
const express = require("express")

const logger = require("@logger/logger")

// Import middleware
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { FRONTEND_URL } = process.env
const { isSecure } = require("@utils/auth-utils")

const logger = require("@root/logger/logger")

const AUTH_TOKEN_EXPIRY_MS = parseInt(
  process.env.AUTH_TOKEN_EXPIRY_DURATION_IN_MILLISECONDS,
  10
)
const CSRF_TOKEN_EXPIRY_MS = 600000
const CSRF_COOKIE_NAME = "isomer-csrf"
const COOKIE_NAME = "isomercms"

class AuthRouter {
  constructor({ authService, authenticationMiddleware }) {
    this.authService = authService
    this.authenticationMiddleware = authenticationMiddleware
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
      secure: isSecure(),
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
    const email = rawEmail.toLowerCase()
    const userInfo = await this.authService.verifyOtp({ email, otp })
    Object.assign(req.session, { userInfo })
    logger.info(`User ${userInfo.email} successfully logged in`)
    return res.sendStatus(200)
  }

  async logout(req, res) {
    this.clearIsomerCookies(res)
    req.session.destroy()
    logger.info(`User ${userInfo.email} successfully logged out`)
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

    router.get(
      "/github-redirect",
      attachReadRouteHandlerWrapper(this.authRedirect)
    )
    router.get("/", attachReadRouteHandlerWrapper(this.githubAuth))
    router.post("/login", attachReadRouteHandlerWrapper(this.login))
    router.post("/verify", attachReadRouteHandlerWrapper(this.verify))
    router.delete("/logout", attachReadRouteHandlerWrapper(this.logout))
    router.get(
      "/whoami",
      this.authenticationMiddleware.verifyAccess,
      attachReadRouteHandlerWrapper(this.whoami)
    )

    return router
  }
}

module.exports = { AuthRouter, CSRF_COOKIE_NAME, COOKIE_NAME }
