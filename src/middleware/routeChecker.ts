import { NextFunction, Request, Response } from "express"

import { BadRequestError } from "@root/errors/BadRequestError"

const SITE_NAME_REGEX = /^[a-zA-Z0-9-]+$/

// eslint-disable-next-line import/prefer-default-export
export class RouteCheckerMiddleware {
  async verifySiteName(req: Request, _res: Response, next: NextFunction) {
    const { params } = req
    const { siteName } = params
    if (siteName && !SITE_NAME_REGEX.test(siteName)) {
      return next(new BadRequestError("Invalid site name"))
    }
    return next()
  }
}
