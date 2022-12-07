import { NotFoundError } from "./NotFoundError"

export default class MissingUserError extends NotFoundError {
  constructor(message = "The user could not be found in Isomer") {
    super()
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.message = message
  }
}
