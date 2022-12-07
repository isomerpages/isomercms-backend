import { NotFoundError } from "./NotFoundError"

export default class MissingResourceRoomError extends NotFoundError {
  constructor(message = "No resource room exists for the site") {
    super()
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.message = message
  }
}
