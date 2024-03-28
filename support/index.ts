import "module-alias/register"

import express from "express"

import { infraService } from "@common/index"
import { useSharedMiddleware } from "@common/middleware"
import { config } from "@root/config/config"
import logger from "@root/logger/logger"

import { v2Router } from "./routes"

const BASE_PORT = config.get("port")
const PORT = BASE_PORT + 1
const app = express()

// poller site launch updates
infraService.pollMessages()

useSharedMiddleware(app)

// TODO: prefix under infra
// FormSG Backend handler routes
app.use("/", v2Router)
app.use("/v2/ping", (req, res) => res.status(200).send("Ok"))

app.listen(PORT, () => {
  logger.info(`Infra container started on port ${PORT}`)
})
