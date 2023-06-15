import { NotFoundError } from "./NotFoundError"

export default class MissingResourceRoomError extends NotFoundError {
  constructor(message = "No resource room exists for the site") {
    super(message)
    this.code = "MissingResourceRoomError"
  }
}
