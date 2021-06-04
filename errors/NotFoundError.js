// Import base error
<<<<<<< HEAD
const { BaseIsomerError } = require("./BaseError")
=======
const { BaseIsomerError } = require('@errors/BaseError')
>>>>>>> refactor: replace imports with aliases for Errors

class NotFoundError extends BaseIsomerError {
  constructor(message) {
    super(404, message)
  }
}

module.exports = {
  NotFoundError,
}
