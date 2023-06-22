import { BaseIsomerError } from "@root/errors/BaseError"

export default class PageParseError extends BaseIsomerError {
  constructor(fileName: string) {
    super({
      status: 500,
      message: `The given file: ${fileName} was not a page!`,
    })
  }
}
