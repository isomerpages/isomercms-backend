// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

class ForbiddenError extends BaseIsomerError {
  constructor(message) {
    super({
      status: 403,
      code: "ForbiddenError",
      message: message || "Access forbidden",
    })
  }
}

module.exports = {
  ForbiddenError,
}
