// Import base error
const { BaseIsomerError } = require('./BaseError')

class NotFoundError extends BaseIsomerError {
    constructor (message) {
      super(404, message)
    }
  }

module.exports = {
    NotFoundError,
}