import { BaseIsomerError } from "./BaseError"

export default class GitHubApiError extends BaseIsomerError {
  constructor(message: string) {
    super({
      status: 500,
      code: "GitHubApiError",
      message,
    })
  }
}
