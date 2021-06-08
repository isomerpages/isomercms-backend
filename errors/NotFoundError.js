// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

class NotFoundError extends BaseIsomerError {
  constructor(message) {
    super(404, message)
  }
}

module.exports = {
  NotFoundError,
}
