// Import base error
const { BaseIsomerError } = require('./BaseError')

class GetMutexError extends BaseIsomerError {
  constructor (message) {
    super(429, message)
  }
}

class ReleaseMutexError extends BaseIsomerError {
  constructor (message) {
    super(500, message)
  }
}

module.exports = {
  GetMutexError,
  ReleaseMutexError
}