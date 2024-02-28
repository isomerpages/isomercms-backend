import { BaseIsomerError } from "./BaseError"

export default class SiteCheckerError extends BaseIsomerError {
  constructor(message: string) {
    super({
      status: 500,
      code: "SiteCheckerError",
      message,
    })
  }
}
