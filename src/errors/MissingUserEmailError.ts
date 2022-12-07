import { NotFoundError } from "./NotFoundError"

export default class MissingUserEmailError extends NotFoundError {
  constructor(message = "No email exists for the specified user!") {
    super()
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.message = message
  }
}
