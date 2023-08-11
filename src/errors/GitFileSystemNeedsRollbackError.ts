import { BaseIsomerError } from "./BaseError"

export default class GitFileSystemNeedsRollbackError extends BaseIsomerError {
  constructor(message: string) {
    super({
      status: 500,
      code: "GitFileSystemNeedsRollbackError",
      message,
    })
  }
}
