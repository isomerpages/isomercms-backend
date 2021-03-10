// Import base error
const { BaseIsomerError } = require('./BaseError')

const inputNameConflictErrorMsg = (fileName) => `A file with ${fileName} already exists.`

const protectedFolderConflictErrorMsg = (folderName) => `${folderName} is a protected folder name.`

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
  protectedFolderConflictErrorMsg,
}