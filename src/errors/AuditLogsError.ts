import { BaseIsomerError } from "./BaseError"

export default class AuditLogsError extends BaseIsomerError {
  constructor(message: string) {
    super({
      status: 500,
      code: "AuditLogsError",
      message,
    })
  }
}
