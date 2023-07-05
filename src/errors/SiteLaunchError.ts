import { BaseIsomerError } from "@root/errors/BaseError"

import { ComponentTypes, FileCodes } from "./IsomerError"

export default class SiteLaunchError extends BaseIsomerError {
  constructor(
    message: string,
    meta = {},
    componentCode = ComponentTypes.Service,
    fileCode = FileCodes.InfraServiceError
  ) {
    super({
      status: 400,
      code: "Launch Error",
      message,
      meta,
      componentCode,
      fileCode,
    })
  }
}
