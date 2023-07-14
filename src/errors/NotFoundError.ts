import { BaseIsomerError } from "@errors/BaseError"

// eslint-disable-next-line import/prefer-default-export
export class NotFoundError extends BaseIsomerError {
  constructor(message: string) {
    super({ status: 404, code: "NotFoundError", message })
  }
}
