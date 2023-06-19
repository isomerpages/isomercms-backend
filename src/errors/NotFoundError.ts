import { BaseIsomerError } from "./BaseError"

export default class NotFoundError extends BaseIsomerError {
  constructor(message?: string) {
    super(404, message)
  }
}

export { NotFoundError }
