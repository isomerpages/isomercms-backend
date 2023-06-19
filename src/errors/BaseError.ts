import type { IsomerInternalError } from "./IsomerError"

class BaseIsomerError extends Error implements IsomerInternalError {
  name: string

  status: number

  message: string

  code = "BaseError" // name of the error

  isIsomerError = true

  meta: Record<string, unknown> // additional properties that provides context for the error

  isV2Err = false // indicates if this is the new error format

  constructor({ status = 500, message = "Something went wrong", meta = {} }) {
    super()
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.status = status
    this.code = this.name
    this.message = message
    this.meta = meta
  }
}

export { BaseIsomerError }
export default BaseIsomerError
