import { NextFunction, Request, Response } from "express"

import RouteNotFoundError from "@root/errors/RouteNotFoundError"

export const catchNonExistentRoutesMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(new RouteNotFoundError())
}

export default catchNonExistentRoutesMiddleware
