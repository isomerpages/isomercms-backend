const axios = require("axios")
const queryString = require("query-string")
const uuid = require("uuid/v4")

// Import error types
const { AuthError } = require("@errors/AuthError")
const { ForbiddenError } = require("@errors/ForbiddenError")

const validateStatus = require("@utils/axios-utils")
const jwtUtils = require("@utils/jwt-utils")

const logger = require("@root/logger/logger")

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env

class AuthService {
  constructor({ usersService }) {
    this.usersService = usersService
  }

  async getAuthRedirectDetails() {
    const state = uuid()
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&state=${state}&scope=repo`

    const token = jwtUtils.signToken({ state })

    return { redirectUrl: githubAuthUrl, cookieToken: token }
  }

  async getGithubAuthToken({ csrfState, code, state }) {
    try {
      const decoded = jwtUtils.verifyToken(csrfState)
      if (decoded.state !== state) {
        logger.error("The given github credentials are not authorized!")
        throw new Error("State does not match")
      }
    } catch (err) {
      // Transform jwt errors into generic ForbiddenErrors - the raw errors shouldn't be provided to the user
      logger.error(
        `Jwt error: ${err.message}, csrfState: ${csrfState}, code: ${code}, state: ${state}`
      )
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
    if (!githubId) throw AuthError("Failed to retrieve user data")

    // Create user if does not exists. Set last logged in to current time.
    const user = await this.usersService.login(githubId)
    if (!user) throw Error("Failed to create user")

    const token = jwtUtils.signToken({
      access_token: jwtUtils.encryptToken(accessToken),
      user_id: githubId,
      isomer_user_id: user.id,
    })

    return token
  }

  async getUserInfo(reqDetails) {
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
      const userId = resp.data.login

      const { email, contactNumber } = await this.usersService.findByGitHubId(
        userId
      )
      return { userId, email, contactNumber }
    } catch (err) {
      return undefined
    }
  }
}

module.exports = {
  AuthService,
}
