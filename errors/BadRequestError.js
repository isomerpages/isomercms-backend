// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

class BadRequestError extends BaseIsomerError {
  constructor(message) {
    super(400, message)
  }
}

module.exports = {
  BadRequestError,
}
