import { AxiosResponse } from "axios"

const { BaseIsomerError } = require("@errors/BaseError")

export default class TokenParsingError extends BaseIsomerError {
  response: AxiosResponse

  constructor(
    response: AxiosResponse,
    message = "Unable parse token from axios response"
  ) {
    super(422, message)
    this.response = response
  }
}
