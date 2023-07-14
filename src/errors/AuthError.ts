import { BaseIsomerError } from "@errors/BaseError"

export class AuthError extends BaseIsomerError {
  constructor(message: string) {
    super({ status: 401, code: "AuthError", message })
  }
}
