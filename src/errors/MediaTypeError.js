// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

class MediaTypeError extends BaseIsomerError {
  constructor(message) {
    super({ status: 415, code: "MediaTypeError", message })
  }
}

module.exports = {
  MediaTypeError,
}
