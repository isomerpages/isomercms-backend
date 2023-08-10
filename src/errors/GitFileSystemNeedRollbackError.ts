import { BaseIsomerError } from "./BaseError"

export default class GitFileSystemNeedRollbackError extends BaseIsomerError {
  constructor(message: string) {
    super({
      status: 500,
      code: "GitFileSystemNeedRollbackError",
      message,
    })
  }
}
