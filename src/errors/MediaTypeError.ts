import { BaseIsomerError } from "./BaseError"

export default class MediaTypeError extends BaseIsomerError {
  constructor(message?: string) {
    super({ status: 415, message })
  }
}

export { MediaTypeError }
