// Import base error
const { BaseIsomerError } = require('./BaseError')

const inputNameConflictErrorMsg = (fileName) => `A file with ${fileName} already exists.`

class ConflictError extends BaseIsomerError {
  constructor (fileName) {
    super(
      409,
      `A file with ${fileName} already exists.`
    )
  }
}
module.exports = {
  ConflictError,
  inputNameConflictErrorMsg,
}