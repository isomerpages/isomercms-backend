import { GrowthBook } from "@growthbook/growthbook"
import {
  RequestHandler as ExpressHandler,
  Request as ExpressRequest,
  Response,
  NextFunction,
} from "express"

import { FeatureFlags } from "./featureFlags"

export type RequestHandler<
  P = unknown,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>
> = ExpressHandler<P, ResBody, ReqBody, ReqQuery, Locals>

export interface RequestWithGrowthBook extends ExpressRequest {
  growthbook?: GrowthBook<FeatureFlags>
}

/**
 * Type for middleware functions with Growthbook integration.
 *
 * @template P Type for URL parameters
 * @template ResBody Type for HTTP response body
 * @template ReqBody Type for HTTP request body
 * @template ReqQuery Type for HTTP request query parameters
 * @template Locals Type for local variables
 */
export type RequestHandlerWithGrowthbook<
  P = unknown,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>
> = (
  req: RequestWithGrowthBook & {
    params: P
    body: ReqBody
    query: ReqQuery
    locals: Locals
  },
  res: Response<ResBody, Locals>,
  next: NextFunction
) => void
