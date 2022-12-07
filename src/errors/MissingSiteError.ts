import { NotFoundError } from "./NotFoundError"

export default class MissingSiteError extends NotFoundError {
  constructor(message = "The site could not be found in Isomer") {
    super()
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.message = message
  }
}
