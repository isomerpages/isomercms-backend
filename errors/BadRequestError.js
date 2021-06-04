// Import base error
<<<<<<< HEAD
const { BaseIsomerError } = require("./BaseError")
=======
const { BaseIsomerError } = require('@errors/BaseError')
>>>>>>> refactor: replace imports with aliases for Errors

class BadRequestError extends BaseIsomerError {
  constructor(message) {
    super(400, message)
  }
}

module.exports = {
  BadRequestError,
}
