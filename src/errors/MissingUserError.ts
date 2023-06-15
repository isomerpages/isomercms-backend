import { NotFoundError } from "./NotFoundError"

export default class MissingUserError extends NotFoundError {
  constructor(message = "The user could not be found in Isomer") {
    super(message)
    this.code = "MissingUserError"
  }
}
