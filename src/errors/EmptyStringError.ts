import { BaseIsomerError } from "./BaseError"

export default class EmptyStringError extends BaseIsomerError {
  constructor(
    message = "An empty string was provided for a method that requires a non-empty string"
  ) {
    super({ status: 500, message })
  }
}
