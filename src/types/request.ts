import { RequestHandler as ExpressHandler } from "express"

export type RequestHandler<
  P = unknown,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>
> = ExpressHandler<P, ResBody, ReqBody, ReqQuery, Locals>
