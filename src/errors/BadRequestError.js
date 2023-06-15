// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

class BadRequestError extends BaseIsomerError {
  constructor(message, meta = {}) {
    super({ status: 400, code: "BadRequestError", message, meta })
  }
}

module.exports = {
  BadRequestError,
}
