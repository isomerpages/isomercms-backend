import { BaseIsomerError } from "./BaseError"

export default class BadRequestError extends BaseIsomerError {
  constructor(message?: string) {
    super({ status: 400, message })
  }
}

export { BadRequestError }
