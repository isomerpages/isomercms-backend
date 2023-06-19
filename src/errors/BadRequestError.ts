import { BaseIsomerError } from "./BaseError"
import {
  IdentifiableError,
  PossibleComponentTypes,
  PossibleFileCodes,
} from "./IsomerError"

export default class BadRequestError
  extends BaseIsomerError
  implements IdentifiableError {
  componentCode: PossibleComponentTypes = "X"

  fileCode: PossibleFileCodes = "000"

  constructor(
    componentCode: IdentifiableError["componentCode"],
    fileCode: IdentifiableError["fileCode"],
    message?: string
  ) {
    super({ status: 400, message })
    this.componentCode = componentCode
    this.fileCode = fileCode
  }
}

export { BadRequestError }
