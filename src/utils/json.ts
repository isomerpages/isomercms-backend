import { Result } from "neverthrow"

import { UnprocessableError } from "@root/errors/UnprocessableError"

export const safeJsonParse = Result.fromThrowable(
  JSON.parse,
  () =>
    new UnprocessableError("The given string could not be parsed into json!")
)
