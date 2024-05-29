import express from "express"

import { ROUTE_VERSION } from "../../constants"

import { formSgRouter } from "./formsg"

const ROUTE_PREFIX = `/${ROUTE_VERSION}/infra`

export const v2Router = express.Router()

v2Router.use(ROUTE_PREFIX, formSgRouter)
