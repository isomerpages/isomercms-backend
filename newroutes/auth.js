const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { FRONTEND_URL } = process.env
const { isSecure } = require("@utils/auth-utils")

const AUTH_TOKEN_EXPIRY_MS = parseInt(
  process.env.AUTH_TOKEN_EXPIRY_DURATION_IN_MILLISECONDS,
  10
)
const CSRF_TOKEN_EXPIRY_MS = 600000
const CSRF_COOKIE_NAME = "isomer-csrf"
const COOKIE_NAME = "isomercms"

class AuthRouter {
  constructor({ authService, authMiddleware }) {
    this.authService = authService
    this.authMiddleware = authMiddleware
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

    const token = await this.authService.getGithubAuthToken({
      csrfState,
      code,
      state,
    })
    const authTokenExpiry = new Date()
    // getTime allows this to work across timezones
    authTokenExpiry.setTime(authTokenExpiry.getTime() + AUTH_TOKEN_EXPIRY_MS)
    const cookieSettings = {
      path: "/",
      expires: authTokenExpiry,
      httpOnly: true,
      sameSite: true,
      secure: isSecure(),
    }
    res.cookie(COOKIE_NAME, token, cookieSettings)
    return res.redirect(`${FRONTEND_URL}/sites`)
  }

  async logout(req, res) {
    this.clearIsomerCookies(res)
    return res.sendStatus(200)
  }

  async whoami(req, res) {
    const { accessToken } = req

    const userInfo = await this.authService.getUserInfo({ accessToken })
    if (!userInfo) {
      this.clearIsomerCookies(res)
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
    router.delete("/logout", attachReadRouteHandlerWrapper(this.logout))
    router.get(
      "/whoami",
      this.authMiddleware.whoamiAuth,
      attachReadRouteHandlerWrapper(this.whoami)
    )

    return router
  }
}

module.exports = { AuthRouter, CSRF_COOKIE_NAME, COOKIE_NAME }
