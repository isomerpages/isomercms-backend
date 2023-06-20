// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

const inputNameConflictErrorMsg = (fileName) =>
  `A file with ${fileName} already exists.`

const protectedFolderConflictErrorMsg = (folderName) =>
  `${folderName} is a protected folder name.`

class ConflictError extends BaseIsomerError {
  constructor(message) {
    super({ status: 409, code: "ConflictError", message })
  }
}
module.exports = {
  ConflictError,
  inputNameConflictErrorMsg,
  protectedFolderConflictErrorMsg,
}
