// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

class MediaTypeError extends BaseIsomerError {
  constructor(message) {
    super(415, message)
  }
}

module.exports = {
  MediaTypeError,
}
