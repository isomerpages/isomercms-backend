const autoBind = require("auto-bind")

const SessionData = require("@root/classes/SessionData")

class AuthMiddleware {
  constructor({ authMiddlewareService }) {
    this.authMiddlewareService = authMiddlewareService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  verifyJwt(req, res, next) {
    const { cookies, originalUrl: url } = req
    const {
      accessToken,
      githubId,
      isomerUserId,
      email,
    } = this.authMiddlewareService.verifyJwt({
      cookies,
      url,
    })
    const userSessionData = new SessionData({
      accessToken,
      githubId,
      isomerUserId,
      email,
    })
    res.locals.sessionData = userSessionData
    return next()
  }

  // Replace access token with site access token if it is available
  async checkHasAccess(req, res, next) {
    const { sessionData } = res.locals

    await this.authMiddlewareService.checkHasAccess(sessionData)

    return next()
  }
}

module.exports = { AuthMiddleware }
