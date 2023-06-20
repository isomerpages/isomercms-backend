import { BaseIsomerError } from "./BaseError"

export default class DatabaseError extends BaseIsomerError {
  constructor(message = "Unable to retrieve data from database") {
    super({ status: 500, code: "DatabaseError", message })
  }
}
