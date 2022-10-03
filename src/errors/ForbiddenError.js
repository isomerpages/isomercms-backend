// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

class ForbiddenError extends BaseIsomerError {
  constructor(message) {
    super(403, message || "Access forbidden")
  }
}

module.exports = {
  ForbiddenError,
}
