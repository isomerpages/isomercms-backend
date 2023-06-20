// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

class NotFoundError extends BaseIsomerError {
  constructor(message) {
    super({ status: 404, code: "NotFoundError", message })
  }
}

module.exports = {
  NotFoundError,
}
