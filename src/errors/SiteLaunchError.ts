import { BaseIsomerError } from "@root/errors/BaseError"

export default class SiteLaunchError extends BaseIsomerError {
  constructor(siteName: string) {
    super({
      status: 500,
      code: "InfraError",
      message: `The given file: ${siteName} was not a config file!`,
    })
  }
}
