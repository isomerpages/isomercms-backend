import { NotFoundError } from "./NotFoundError"

export default class MissingUserEmailError extends NotFoundError {
  constructor(message = "No email exists for the specified user!") {
    super(message)
    this.code = "MissingUserEmailError"
  }
}
