import { BaseIsomerError } from "@errors/BaseError"

import { ComponentTypes, FileCodes } from "./IsomerError"

// eslint-disable-next-line import/prefer-default-export
export class BadRequestError extends BaseIsomerError {
  constructor(
    message: string,
    meta = {},
    componentCode = ComponentTypes.Other,
    fileCode = FileCodes.Undefined
  ) {
    super({
      status: 400,
      code: "BadRequestError",
      message,
      meta,
      componentCode,
      fileCode,
    })
  }
}
