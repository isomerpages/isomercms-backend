import { config } from "@config/config"

import { isSecure } from "@root/utils/auth-utils"

const axios = require("axios")
const express = require("express")
const queryString = require("query-string")
const uuid = require("uuid/v4")

const logger = require("@logger/logger")

// Import error
const { AuthError } = require("@errors/AuthError")
const { ForbiddenError } = require("@errors/ForbiddenError")

// Import middleware
const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

const validateStatus = require("@utils/axios-utils")
const jwtUtils = require("@utils/jwt-utils")

const { authenticationMiddleware } = require("@root/middleware")
// Import services
const identityServices = require("@services/identity")

const router = express.Router()

const CLIENT_ID = config.get("github.clientId")
const CLIENT_SECRET = config.get("github.clientSecret")
const REDIRECT_URI = config.get("github.redirectUri")
const CSRF_TOKEN_EXPIRY_MS = 600000
const FRONTEND_URL = config.get("app.frontendUrl")

const CSRF_COOKIE_NAME = "isomer-csrf"
const COOKIE_NAME = "isomercms"

async function clearAllCookies(res) {
  const cookieSettings = {
    path: "/",
  }

  res.clearCookie(COOKIE_NAME, cookieSettings)
  res.clearCookie(CSRF_COOKIE_NAME, cookieSettings)
}

async function authRedirect(req, res) {
  const state = uuid()
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&state=${state}&scope=repo`

  const csrfTokenExpiry = new Date()
  csrfTokenExpiry.setTime(csrfTokenExpiry.getTime() + CSRF_TOKEN_EXPIRY_MS)

  const cookieSettings = {
    expires: csrfTokenExpiry,
    httpOnly: true,
    secure: isSecure,
  }

  const token = jwtUtils.signToken({ state })

  res.cookie(CSRF_COOKIE_NAME, token, cookieSettings)
  return res.redirect(githubAuthUrl)
}

async function githubAuth(req, res) {
  const csrfState = req.cookies[CSRF_COOKIE_NAME]
  const { code, state } = req.query

  try {
    const decoded = jwtUtils.verifyToken(csrfState)
    if (decoded.state !== state) throw new Error("State does not match")
  } catch (err) {
    throw new ForbiddenError()
  }

  const params = {
    code,
    redirect_uri: REDIRECT_URI,
    state,
  }

  const resp = await axios.post(
    "https://github.com/login/oauth/access_token",
    params,
    {
      auth: {
        username: CLIENT_ID,
        password: CLIENT_SECRET,
      },
    }
  )

  const { access_token: accessToken } = queryString.parse(resp.data)
  if (!accessToken) throw new AuthError("Access token not found")

  // Retrieve user information to put into access token
  const endpoint = `https://api.github.com/user`
  const userResp = await axios.get(endpoint, {
    validateStatus,
    headers: {
      Authorization: `token ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
  })

  const githubId = userResp.data && userResp.data.login

  // Create user if does not exists. Set last logged in to current time.
  const user = await identityServices.usersService.login(githubId)
  if (!user) throw Error("Failed to create user")

  const userInfo = {
    accessToken: jwtUtils.encryptToken(accessToken),
    githubId,
    isomerUserId: user.id,
  }
  Object.assign(req.session, { userInfo })
  logger.info(`User ${userInfo.email} successfully logged in`)
  return res.redirect(`${FRONTEND_URL}/sites`)
}

async function logout(req, res) {
  clearAllCookies(res)
  req.session.destroy()
  logger.info(`User ${userInfo.email} successfully logged out`)
  return res.sendStatus(200)
}

async function whoami(req, res) {
  const { userSessionData } = res.locals
  const { accessToken } = userSessionData

  // Make a call to github
  const endpoint = "https://api.github.com/user"

  try {
    const resp = await axios.get(endpoint, {
      headers: {
        Authorization: `token ${accessToken}`,
        "Content-Type": "application/json",
      },
    })
    const userId = resp.data.login

    const {
      email,
      contactNumber,
    } = await identityServices.usersService.findByGitHubId(userId)
    return res.status(200).json({ userId, email, contactNumber })
  } catch (err) {
    clearAllCookies(res)
    // Return a 401 os that user will be redirected to logout
    return res.sendStatus(401)
  }
}

router.get("/github-redirect", attachReadRouteHandlerWrapper(authRedirect))
router.get("/", attachReadRouteHandlerWrapper(githubAuth))
router.delete("/logout", attachReadRouteHandlerWrapper(logout))
router.get(
  "/whoami",
  authenticationMiddleware.verifyAccess,
  attachReadRouteHandlerWrapper(whoami)
)

module.exports = router
