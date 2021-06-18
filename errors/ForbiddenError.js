// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

class ForbiddenError extends BaseIsomerError {
  constructor() {
    super(403, "Access forbidden")
  }
}

module.exports = {
  ForbiddenError,
}
