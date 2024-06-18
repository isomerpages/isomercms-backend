import "module-alias/register"

import express from "express"

import { infraService, launchesService, sequelize } from "@common/index"
import { useSharedMiddleware } from "@common/middleware"
import { config } from "@root/config/config"
import logger from "@root/logger/logger"
import MonitoringService from "@root/monitoring/MonitoringService"
import MonitoringWorker from "@root/monitoring/MonitoringWorker"

import { ROUTE_VERSION } from "./constants"
import { v2Router } from "./routes"
import { isobotRouter } from "./routes/v2/isobot"

const BASE_PORT = config.get("port")
const PORT = BASE_PORT + 1
const app = express()

// poller site launch updates
infraService.pollMessages()

// only needed for support container
export const monitoringWorker = new MonitoringWorker({
  launchesService,
})
// dnsMonitor("isomer.gov.sg").mapErr(console.log).map(console.log)
// todo: remove after testing
monitoringWorker.driver()

export const monitoringService = new MonitoringService({
  monitoringWorker,
})

const ROUTE_PREFIX_ISOBOT = `/${ROUTE_VERSION}/isobot`
app.use(ROUTE_PREFIX_ISOBOT, isobotRouter)

useSharedMiddleware(app)
app.use("/", v2Router)
app.use(`/${ROUTE_VERSION}/ping`, (req, res) => res.status(200).send("Ok"))

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
