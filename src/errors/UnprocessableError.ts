// Import base error
import { BaseIsomerError } from "@errors/BaseError"

// eslint-disable-next-line import/prefer-default-export
export class UnprocessableError extends BaseIsomerError {
  constructor(message: string) {
    super({ status: 422, code: "UnprocessableError", message })
  }
}
