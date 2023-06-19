import { BaseIsomerError } from "./BaseError"

export default class ForbiddenError extends BaseIsomerError {
  constructor(message = "Access forbidden") {
    super({ status: 403, message })
  }
}

export { ForbiddenError }
