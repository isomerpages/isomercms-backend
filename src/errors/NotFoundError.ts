import { BaseIsomerError } from "./BaseError"

export default class NotFoundError extends BaseIsomerError {
  constructor(message?: string) {
    super({ status: 404, message })
  }
}

export { NotFoundError }
