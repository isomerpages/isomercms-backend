const { BaseIsomerError } = require("@errors/BaseError")

export default class NoAvailableTokenError extends BaseIsomerError {
  timestamp: Date

  constructor(
    message = "Unable to select token for request",
    timestamp = new Date()
  ) {
    super(503, message)
    this.timestamp = timestamp
  }
}
