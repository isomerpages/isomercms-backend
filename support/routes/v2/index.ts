import express from "express"

import { formSgRouter } from "./formsg"
import { isobotRouter } from "./isobot"

const ROUTE_PREFIX = "/v2/infra"
const ROUTE_PREFIX_ISOBOT = "/v2/isobot"

export const v2Router = express.Router()

v2Router.use(ROUTE_PREFIX, formSgRouter)
v2Router.use(ROUTE_PREFIX_ISOBOT, isobotRouter)
