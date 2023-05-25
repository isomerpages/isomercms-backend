import { BaseIsomerError } from "@root/errors/BaseError"

export default class ConfigParseError extends BaseIsomerError {
  constructor(fileName: string) {
    super(500, `The given file: ${fileName} was not a config file!`)
  }
}
