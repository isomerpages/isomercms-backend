import { BaseIsomerError } from "./BaseError"

export default class AuthError extends BaseIsomerError {
  constructor(message?: string) {
    super({ status: 401, message })
  }
}
export { AuthError }
