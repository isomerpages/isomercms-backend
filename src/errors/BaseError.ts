import { ComponentTypes, IsomerInternalError } from "./IsomerError"

class BaseIsomerError extends Error implements IsomerInternalError {
  name: string

  status: number

  message: string

  code = "BaseError"

  isIsomerError = true

  meta: Record<string, unknown>

  isV2Err = false

  componentCode: string

  fileCode: string

  constructor({
    status = 500,
    code = "BaseError",
    message = "Something went wrong",
    meta = {},
    componentCode = ComponentTypes.Other,
    fileCode = "000",
  }) {
    super()
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.code = code
    this.status = status
    this.message = message
    this.meta = meta
    this.componentCode = componentCode
    this.fileCode = fileCode
  }
}

module.exports = {
  BaseIsomerError,
}

export { BaseIsomerError }
