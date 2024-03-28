import express from "express"

import { formSgRouter } from "./formsg"

const ROUTE_PREFIX = "/v2/infra"

export const v2Router = express.Router()

v2Router.use(ROUTE_PREFIX, formSgRouter)
