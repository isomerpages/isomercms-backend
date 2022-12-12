import { NotFoundError } from "./NotFoundError"

export default class MissingSiteError extends NotFoundError {
  constructor(message = "The site could not be found in Isomer") {
    super(message)
  }
}
