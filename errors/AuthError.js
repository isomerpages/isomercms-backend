// Import base error
const { BaseIsomerError } = require('./BaseError')

class AuthError extends BaseIsomerError {
    constructor (message) {
      super(401, message)
    }
  }

module.exports = {
    AuthError,
}