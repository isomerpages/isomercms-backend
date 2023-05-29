import moment from "moment-timezone"

import { config } from "@root/config/config"

import { cloudwatchLogger } from "./cloudwatch.logger"
import { consoleLogger } from "./console.logger"
import { Formatter, Logger, LogMethod } from "./logger.types"

const NODE_ENV = config.get("env")
const useCloudwatchLogger = NODE_ENV === "prod" || NODE_ENV === "vapt"
const useConsoleLogger = !(NODE_ENV === "test")

const timestampGenerator = () =>
  moment().tz("Asia/Singapore").format("YYYY-MM-DD HH:mm:ss")

export class IsomerLogger implements Logger {
  loggers: Logger[]

  formatters: Formatter[]

  constructor() {
    this.loggers = []
    this.formatters = []
  }

  private getFormattedMessage = (message: string): string =>
    this.formatters.reduce((prev, cur) => cur(prev), message)

  info: LogMethod = (message: string): void => {
    this.loggers.map((logger) => logger.info(this.getFormattedMessage(message)))
  }

  warn: LogMethod = (message: string): void => {
    this.loggers.map((logger) => logger.warn(this.getFormattedMessage(message)))
  }

  error: LogMethod = (message: string): void => {
    this.loggers.map((logger) =>
      logger.error(this.getFormattedMessage(message))
    )
  }

  use(logger: Logger) {
    this.loggers.push(logger)
  }

  useFormatter(formatter: Formatter) {
    this.formatters.push(formatter)
  }
}

const logger = new IsomerLogger()
if (useConsoleLogger) logger.use(consoleLogger)
if (useCloudwatchLogger) logger.use(cloudwatchLogger)
logger.useFormatter((message) => `${timestampGenerator()}: ${message}`)

export default logger
