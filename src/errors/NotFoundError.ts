import { BaseIsomerError } from "@errors/BaseError"

// eslint-disable-next-line import/prefer-default-export
export class NotFoundError extends BaseIsomerError {
  constructor(message = "The requested resource was not found") {
    super({ status: 404, code: "NotFoundError", message })
  }
}
