// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

class UnprocessableError extends BaseIsomerError {
  constructor(message) {
    super(422, message)
  }
}

module.exports = {
  UnprocessableError,
}
