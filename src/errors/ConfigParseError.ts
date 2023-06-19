import { BaseIsomerError } from "@root/errors/BaseError"

export default class ConfigParseError extends BaseIsomerError {
  constructor(fileName: string) {
    super({
      status: 500,
      message: `The given file: ${fileName} was not a config file!`,
    })
  }
}
