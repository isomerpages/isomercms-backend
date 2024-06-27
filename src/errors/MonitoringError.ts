import { BaseIsomerError } from "./BaseError"

export default class MonitoringError extends BaseIsomerError {
  constructor(message: string) {
    super({
      status: 500,
      code: "MonitoringError",
      message,
    })
  }
}
