import { BaseIsomerError } from "@root/errors/BaseError"

export default class PageParseError extends BaseIsomerError {
  constructor(fileName: string) {
    super(`The given file: ${fileName} was not a page!`)
  }
}
