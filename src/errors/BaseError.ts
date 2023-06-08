import { IsomerInternalError } from "./IsomerError"

class BaseIsomerError extends Error implements IsomerInternalError {
  status: number

  code = "BaseError"

  isIsomerError = true

  constructor(status = 500, message = "Something went wrong") {
    super()
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.status = status
    this.message = message
  }
}

module.exports = {
  BaseIsomerError,
}

export { BaseIsomerError }
