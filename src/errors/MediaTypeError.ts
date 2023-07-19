import { BaseIsomerError } from "@errors/BaseError"

// eslint-disable-next-line import/prefer-default-export
export class MediaTypeError extends BaseIsomerError {
  constructor(message: string) {
    super({ status: 415, code: "MediaTypeError", message })
  }
}
