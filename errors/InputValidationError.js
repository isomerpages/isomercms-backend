// Import base error
const { BaseIsomerError } = require('./BaseError')

class InputNameConflictError extends BaseIsomerError {
  constructor (fileName) {
    super(
      409,
      `A file with ${fileName} already exists.`
    )
  }
}
module.exports = {
    InputNameConflictError,
}