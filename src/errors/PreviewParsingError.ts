import { BaseIsomerError } from "@errors/BaseError"

export default class FaviconParsingError extends BaseIsomerError {
  url: string

  constructor(url: string, message = "Unable parse favicon from document") {
    super({ status: 422, code: "FaviconParsingError", message })
    this.url = url
  }
}
