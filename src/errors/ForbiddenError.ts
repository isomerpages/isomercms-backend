// Import base error
import { BaseIsomerError } from "@errors/BaseError"

// eslint-disable-next-line import/prefer-default-export
export class ForbiddenError extends BaseIsomerError {
  constructor(message: string) {
    super({
      status: 403,
      code: "ForbiddenError",
      message: message || "Access forbidden",
    })
  }
}
