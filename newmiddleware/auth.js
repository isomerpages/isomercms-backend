const autoBind = require("auto-bind")

class AuthMiddleware {
  constructor({ authMiddlewareService }) {
    this.authMiddlewareService = authMiddlewareService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  verifyJwt(req, res, next) {
    const { cookies, originalUrl: url } = req
    const { accessToken, userId } = this.authMiddlewareService.verifyJwt({
      cookies,
      url,
    })
    req.accessToken = accessToken
    res.locals.userId = userId
    return next()
  }

  whoamiAuth(req, res, next) {
    const { cookies, originalUrl: url } = req
    const { accessToken, userId } = this.authMiddlewareService.whoamiAuth({
      cookies,
      url,
    })
    req.accessToken = accessToken
    if (userId) res.locals.userId = userId
    return next()
  }

  // Replace access token with site access token if it is available
  async useSiteAccessTokenIfAvailable(req, res, next) {
    const {
      accessToken: userAccessToken,
      params: { siteName },
    } = req
    const {
      locals: { userId },
    } = res

    const siteAccessToken = await this.authMiddlewareService.retrieveSiteAccessTokenIfAvailable(
      { siteName, userAccessToken, userId }
    )

    if (siteAccessToken) req.accessToken = siteAccessToken

    return next()
  }
}
module.exports = { AuthMiddleware }
