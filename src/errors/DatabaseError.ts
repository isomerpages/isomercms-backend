import { BaseIsomerError } from "./BaseError"

export default class DatabaseError extends BaseIsomerError {
  constructor(message = "Unable to retrieve data from database") {
    super()
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.message = message
  }
}
