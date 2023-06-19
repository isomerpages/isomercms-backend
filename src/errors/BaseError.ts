import { ComponentTypes, IsomerInternalError } from "./IsomerError"

class BaseIsomerError extends Error implements IsomerInternalError {
  name: string

  status: number

  message: string

  code = "BaseError" // name of the error

  isIsomerError = true

  meta: Record<string, unknown> // additional properties that provides context for the error

  isV2Err = false // indicates if this is the new error format

  componentCode: string // a selection from ComponentTypes

  fileCode: string // a selection from FileCodes

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
    this.code = this.name
    this.message = message
    this.meta = meta
    this.componentCode = componentCode
    this.fileCode = fileCode
  }
}

export { BaseIsomerError }
export default BaseIsomerError
