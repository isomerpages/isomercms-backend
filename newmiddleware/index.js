const {
  AuthMiddlewareService,
} = require("@services/middlewareServices/AuthMiddlewareService")

const { AuthMiddleware } = require("./auth")

const authMiddlewareService = new AuthMiddlewareService()
const authMiddleware = new AuthMiddleware({ authMiddlewareService })

module.exports = {
  authMiddleware,
}
