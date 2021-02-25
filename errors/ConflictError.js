// Import base error
const { BaseIsomerError } = require('./BaseError')

const inputNameConflictErrorMsg = (fileName) => `A file with ${fileName} already exists.`

class ConflictError extends BaseIsomerError {
  constructor (message) {
    super(
      409,
      message
    )
  }
}
module.exports = {
  ConflictError,
  inputNameConflictErrorMsg,
}