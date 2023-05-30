import moment from "moment-timezone"

import { config } from "@root/config/config"

import CloudWatchLogger from "./cloudwatch.logger"
import { consoleLogger } from "./console.logger"
import { Formatter, Loggable, Logger, LogMethod } from "./logger.types"

const NODE_ENV = config.get("env")
const useCloudwatchLogger = NODE_ENV === "prod" || NODE_ENV === "vapt"
const useConsoleLogger = !(NODE_ENV === "test")

const timestampGenerator = () =>
  moment().tz("Asia/Singapore").format("YYYY-MM-DD HH:mm:ss")

export class IsomerLogger implements Logger {
  private loggers: Logger[]

  private formatters: Formatter[]

  constructor() {
    this.loggers = []
    this.formatters = []
  }

  private getFormattedMessage = (message: Loggable): string => {
    const baseMessage =
      typeof message === "string" ? message : JSON.stringify(message)
    return this.formatters.reduce((prev, cur) => cur(prev), baseMessage)
  }

  info: LogMethod = (message: Loggable): void => {
    this.loggers.map((logger) => logger.info(this.getFormattedMessage(message)))
  }

  warn: LogMethod = (message: Loggable): void => {
    this.loggers.map((logger) => logger.warn(this.getFormattedMessage(message)))
  }

  error: LogMethod = (message: Loggable): void => {
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
if (useCloudwatchLogger) logger.use(new CloudWatchLogger())
logger.useFormatter((message) => `${timestampGenerator()}: ${message}`)

export default logger
