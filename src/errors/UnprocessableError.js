// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

class UnprocessableError extends BaseIsomerError {
  constructor(message) {
    super({ status: 422, code: "UnprocessableError", message })
  }
}

module.exports = {
  UnprocessableError,
}
