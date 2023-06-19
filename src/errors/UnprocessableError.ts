import { BaseIsomerError } from "@root/errors/BaseError"

export default class UnprocessableError extends BaseIsomerError {
  constructor(message?: string) {
    super(422, message)
  }
}

export { UnprocessableError }
