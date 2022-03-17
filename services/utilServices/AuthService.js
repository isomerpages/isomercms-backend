const axios = require("axios")
const queryString = require("query-string")
const uuid = require("uuid/v4")

// Import error types
const { AuthError } = require("@errors/AuthError")
const { ForbiddenError } = require("@errors/ForbiddenError")

const validateStatus = require("@utils/axios-utils")
const jwtUtils = require("@utils/jwt-utils")

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env

class AuthService {
  async getAuthRedirectDetails() {
    const state = uuid()
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&state=${state}&scope=repo`

    const token = jwtUtils.signToken({ state })

    return { redirectUrl: githubAuthUrl, cookieToken: token }
  }

  async getGithubAuthToken({ csrfState, code, state }) {
    const isCsrfValid =
      jwtUtils.verifyToken(csrfState) &&
      jwtUtils.decodeToken(csrfState).state === state
    if (!isCsrfValid) throw new ForbiddenError()

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

    const userId = userResp.data && userResp.data.login

    const token = jwtUtils.signToken({
      access_token: jwtUtils.encryptToken(accessToken),
      user_id: userId,
    })

    return token
  }

  async getUserId(reqDetails) {
    const { accessToken } = reqDetails

    // Make a call to github
    const endpoint = "https://api.github.com/user"

    try {
      const resp = await axios.get(endpoint, {
        headers: {
          Authorization: `token ${accessToken}`,
          "Content-Type": "application/json",
        },
      })
      return resp.data.login
    } catch (err) {
      return undefined
    }
  }
}

module.exports = {
  AuthService,
}
