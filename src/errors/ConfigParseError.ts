import { BaseIsomerError } from "@root/errors/BaseError"

export default class ConfigParseError extends BaseIsomerError {
  constructor(fileName: string) {
    super(`The given file: ${fileName} was not a config file!`)
  }
}
