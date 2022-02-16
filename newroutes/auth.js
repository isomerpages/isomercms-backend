const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const { FRONTEND_URL } = process.env

const AUTH_TOKEN_EXPIRY_MS = parseInt(
  process.env.AUTH_TOKEN_EXPIRY_DURATION_IN_MILLISECONDS,
  10
)
const CSRF_TOKEN_EXPIRY_MS = 600000
const CSRF_COOKIE_NAME = "isomer-csrf"
const COOKIE_NAME = "isomercms"

class AuthRouter {
  constructor({ authService }) {
    this.authService = authService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  isSecure() {
    return (
      process.env.NODE_ENV !== "DEV" &&
      process.env.NODE_ENV !== "LOCAL_DEV" &&
      process.env.NODE_ENV !== "test"
    )
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
      secure: this.isSecure(),
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
      secure: this.isSecure(),
    }
    res.cookie(COOKIE_NAME, token, cookieSettings)
    return res.redirect(`${FRONTEND_URL}/sites`)
  }

  async logout(req, res) {
    const cookieSettings = {
      path: "/",
    }
    res.clearCookie(COOKIE_NAME, cookieSettings)
    res.clearCookie(CSRF_COOKIE_NAME, cookieSettings)
    return res.sendStatus(200)
  }

  async whoami(req, res) {
    const { accessToken } = req

    const userId = await this.authService.getUserId({ accessToken })
    return res.status(200).json({ userId })
  }

  getRouter() {
    const router = express.Router()

    router.get(
      "/github-redirect",
      attachReadRouteHandlerWrapper(this.authRedirect)
    )
    router.get("/", attachReadRouteHandlerWrapper(this.githubAuth))
    router.delete("/logout", attachReadRouteHandlerWrapper(this.logout))
    router.get("/whoami", attachReadRouteHandlerWrapper(this.whoami))

    return router
  }
}

module.exports = { AuthRouter, CSRF_COOKIE_NAME, COOKIE_NAME }
