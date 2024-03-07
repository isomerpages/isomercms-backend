import { BaseIsomerError } from "./BaseError"

export default class RouteNotFoundError extends BaseIsomerError {
  constructor(meta = {}) {
    super({
      status: 404,
      code: "Route Not Found Error",
      meta,
    })
  }
}
