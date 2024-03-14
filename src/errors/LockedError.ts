import { BaseIsomerError } from "./BaseError"

export default class LockedError extends BaseIsomerError {
  constructor(message: string) {
    super({
      status: 423,
      code: "LockedError",
      message,
    })
  }
}
