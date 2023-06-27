import { BaseIsomerError } from "@root/errors/BaseError"

export default class PlaceholderParseError extends BaseIsomerError {
  constructor(fileName: string) {
    super({
      status: 500,
      code: "PlaceholderParseError",
      message: `The given file: ${fileName} was not a placeholder file!`,
    })
  }
}
