import { BaseIsomerError } from "@errors/BaseError"

export default class NoAvailableTokenError extends BaseIsomerError {
  timestamp: Date

  constructor(
    message = "Unable to select token for request",
    timestamp = new Date()
  ) {
    super({ status: 503, code: "NoAvailableTokenError", message })
    this.timestamp = timestamp
  }
}
