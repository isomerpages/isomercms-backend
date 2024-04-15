import "module-alias/register"

import express from "express"

import { infraService, sequelize } from "@common/index"
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

app.use("/", v2Router)
app.use("/v2/ping", (req, res) => res.status(200).send("Ok"))

sequelize
  .authenticate()
  .then(() => {
    logger.info(
      "Connection to db has been established successfully on support service."
    )
    app.listen(PORT, () => {
      logger.info(`Infra container started on port ${PORT}`)
    })
  })
  .catch((err) => {
    logger.error(`Unable to connect to the database: ${err}`)

    // If we cannot connect to the db, report an error using status code
    // And gracefully shut down the application since we can't serve client
    process.exit(1)
  })
