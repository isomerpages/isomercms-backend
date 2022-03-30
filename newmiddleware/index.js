const {
  AuthMiddlewareService,
} = require("@services/middlewareServices/AuthMiddlewareService")

const { AuthMiddleware } = require("./auth")

const getAuthMiddleware = ({ identityAuthService }) => {
  const authMiddlewareService = new AuthMiddlewareService({
    identityAuthService,
  })
  const authMiddleware = new AuthMiddleware({ authMiddlewareService })
  return authMiddleware
}

module.exports = {
  getAuthMiddleware,
}
