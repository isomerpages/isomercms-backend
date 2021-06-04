// Import base error
<<<<<<< HEAD
const { BaseIsomerError } = require("./BaseError")
=======
const { BaseIsomerError } = require('@errors/BaseError')
>>>>>>> refactor: replace imports with aliases for Errors

class AuthError extends BaseIsomerError {
  constructor(message) {
    super(401, message)
  }
}

module.exports = {
  AuthError,
}
