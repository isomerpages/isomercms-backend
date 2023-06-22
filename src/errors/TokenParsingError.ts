import { AxiosResponse } from "axios"

import { BaseIsomerError } from "@errors/BaseError"

export default class TokenParsingError extends BaseIsomerError {
  response: AxiosResponse

  constructor(
    response: AxiosResponse,
    message = "Unable parse token from axios response"
  ) {
    super({ status: 422, message })
    this.response = response
  }
}
