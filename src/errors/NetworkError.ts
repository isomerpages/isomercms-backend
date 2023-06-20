import { BaseIsomerError } from "@root/errors/BaseError"

export default class NetworkError extends BaseIsomerError {
  constructor(
    message = "An error occurred with the network whilst processing your request. Please try again later."
  ) {
    super({ status: 500, code: "NetworkError", message })
  }
}
