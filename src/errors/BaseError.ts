class BaseIsomerError extends Error {
  status: number

  isIsomerError: boolean

  constructor(status = 500, message = "Something went wrong") {
    super()
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.status = status
    this.message = message
    this.isIsomerError = true
  }
}

module.exports = {
  BaseIsomerError,
}

export { BaseIsomerError }
