// Import base error
const { BaseIsomerError } = require("@errors/BaseError")

const { ComponentTypes } = require("./IsomerError")

class BadRequestError extends BaseIsomerError {
  constructor(
    message,
    meta = {},
    componentCode = ComponentTypes.Other,
    fileCode = "000"
  ) {
    super({
      status: 400,
      code: "BadRequestError",
      message,
      meta,
      componentCode,
      fileCode,
    })
  }
}

module.exports = {
  BadRequestError,
}
