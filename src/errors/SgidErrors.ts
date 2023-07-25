import { BaseIsomerError } from "@root/errors/BaseError"

export class SgidCreateRedirectUrlError extends BaseIsomerError {
  constructor(message = "Error while creating redirect URL") {
    super({
      status: 500,
      code: "SgidCreateRedirectUrlError",
      message,
    })
  }
}

export class SgidFetchAccessTokenError extends BaseIsomerError {
  constructor(message = "Error while fetching access token") {
    super({
      status: 500,
      code: "SgidFetchAccessTokenError",
      message,
    })
  }
}

export class SgidFetchUserInfoError extends BaseIsomerError {
  constructor(message = "Error while fetching user info") {
    super({
      status: 500,
      code: "SgidFetchUserInfoError",
      message,
    })
  }
}
