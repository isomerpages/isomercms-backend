import { GrowthBook } from "@growthbook/growthbook"
import {
  RequestHandler as ExpressHandler,
  Request as ExpressRequest,
  Response,
  NextFunction,
} from "express"

export type RequestHandler<
  P = unknown,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>
> = ExpressHandler<P, ResBody, ReqBody, ReqQuery, Locals>

interface GrowthBookRequest extends ExpressRequest {
  growthbook: GrowthBook
}

export type RequestHandlerWithGrowthbook<
  P = unknown,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>
> = (
  req: GrowthBookRequest & {
    params: P
    body: ReqBody
    query: ReqQuery
    locals: Locals
  },
  res: Response<ResBody, Locals>,
  next: NextFunction
) => any
