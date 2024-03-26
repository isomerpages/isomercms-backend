import "module-alias/register"

import express from "express"

import { infraService } from "@common/index"
import { useSharedMiddleware } from "@common/middleware"
import { config } from "@root/config/config"
import logger from "@root/logger/logger"

import { v2Router } from "./routes"

const PORT = config.get("port")

const app = express()

// poller site launch updates
infraService.pollMessages()

useSharedMiddleware(app)

// TODO: prefix under infra
// FormSG Backend handler routes
app.use("/", v2Router)

app.listen(PORT, () => {
  logger.info(`Infra container started on port ${PORT}`)
})
