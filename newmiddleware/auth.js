const autoBind = require("auto-bind")

class AuthMiddleware {
  constructor({ authMiddlewareService }) {
    this.authMiddlewareService = authMiddlewareService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  noVerify(req, res, next) {
    return next()
  }

  verifyJwt(req, res, next) {
    const { cookies, url } = req
    const { accessToken, userId } = this.authMiddlewareService.verifyJwt({
      cookies,
      url,
    })
    req.accessToken = accessToken
    req.userId = userId
    return next()
  }

  whoamiAuth(req, res, next) {
    const { cookies, url } = req
    const { accessToken, userId } = this.authMiddlewareService.whoamiAuth({
      cookies,
      url,
    })
    req.accessToken = accessToken
    if (userId) req.userId = userId
    return next()
  }
}
module.exports = { AuthMiddleware }
