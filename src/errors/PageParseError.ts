import { BaseIsomerError } from "@root/errors/BaseError"

export default class PageParseError extends BaseIsomerError {
  constructor(fileName: string) {
    super(500, `The given file: ${fileName} was not a page!`)
  }
}
