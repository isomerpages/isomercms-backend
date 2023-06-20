// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

class AuthError extends BaseIsomerError {
  constructor(message) {
    super({ status: 401, code: "AuthError", message })
  }
}

module.exports = {
  AuthError,
}
