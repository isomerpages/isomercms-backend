import { NotFoundError } from "./NotFoundError"

export default class RequestNotFoundError extends NotFoundError {
  constructor(message = "The specified review request could not be found!") {
    super()
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.message = message
  }
}
