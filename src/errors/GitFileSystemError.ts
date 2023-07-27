import { BaseIsomerError } from "./BaseError"

export default class GitFileSystemError extends BaseIsomerError {
  constructor(message: string) {
    super({
      status: 500,
      code: "GitFileSystemError",
      message,
    })
  }
}
