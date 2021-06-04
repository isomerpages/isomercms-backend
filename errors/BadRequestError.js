// Import base error
const { BaseIsomerError } = require("./BaseError")

class BadRequestError extends BaseIsomerError {
  constructor(message) {
    super(400, message)
  }
}

module.exports = {
  BadRequestError,
}
