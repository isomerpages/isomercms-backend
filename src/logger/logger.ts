import moment from "moment-timezone"

import { config } from "@root/config/config"

import CloudWatchLogger from "./cloudwatch.logger"
import { consoleLogger } from "./console.logger"
import {
  Formatter,
  Loggable,
  ExtendedLogger,
  LogMethod,
  Logger,
  WithDebug,
  LoggerVariants,
  WithFatal,
} from "./logger.types"

const NODE_ENV = config.get("env")
const useCloudwatchLogger =
  NODE_ENV === "prod" || NODE_ENV === "vapt" || NODE_ENV === "staging"
const useConsoleLogger = !(NODE_ENV === "test")

const timestampGenerator = () =>
  moment().tz("Asia/Singapore").format("YYYY-MM-DD HH:mm:ss")

const hasDebug = (logger: LoggerVariants): logger is WithDebug<Logger> =>
  (logger as WithDebug<Logger>).debug !== undefined

const hasFatal = (logger: LoggerVariants): logger is WithFatal<Logger> =>
  (logger as WithFatal<Logger>).fatal !== undefined

export class IsomerLogger implements ExtendedLogger {
  private loggers: LoggerVariants[]

  private formatters: Formatter[]

  constructor() {
    this.loggers = []
    this.formatters = []
  }

  private getStructuredMessage = (
    level: string,
    message: Loggable,
    additionalData?: object
  ): string => {
    const baseMessage = {
      timestamp: timestampGenerator(),
      level,
      message: typeof message === "string" ? message : JSON.stringify(message),
      ...additionalData, // Spread additional data into the log entry
    }
    return JSON.stringify(baseMessage) // Convert the log entry to a JSON string
  }

  info: LogMethod = (message: Loggable, additionalData?: object): void => {
    this.loggers.forEach((logger) =>
      logger.info(this.getStructuredMessage("info", message, additionalData))
    )
  }

  warn: LogMethod = (message: Loggable, additionalData?: object): void => {
    this.loggers.forEach((logger) =>
      logger.warn(this.getStructuredMessage("warn", message, additionalData))
    )
  }

  error: LogMethod = (message: Loggable, additionalData?: object): void => {
    this.loggers.forEach((logger) =>
      logger.error(this.getStructuredMessage("error", message, additionalData))
    )
  }

  debug: LogMethod = (message: Loggable, additionalData?: object): void => {
    this.loggers.forEach((logger) => {
      if (hasDebug(logger))
        logger.debug(
          this.getStructuredMessage("debug", message, additionalData)
        )
    })
  }

  fatal: LogMethod = (message: Loggable, additionalData?: object): void => {
    this.loggers.forEach((logger) => {
      if (hasFatal(logger))
        logger.fatal(
          this.getStructuredMessage("fatal", message, additionalData)
        )
    })
  }

  use(logger: LoggerVariants) {
    this.loggers.push(logger)
  }

  useFormatter(formatter: Formatter) {
    this.formatters.push(formatter) // Note: You might want to adjust formatter logic to work with structured logs
  }
}

const logger = new IsomerLogger()
if (useConsoleLogger) logger.use(consoleLogger)
if (useCloudwatchLogger) logger.use(new CloudWatchLogger())
// Example formatter usage may need to be adjusted for structured logging
// logger.useFormatter((message) => `${timestampGenerator()}: ${message}`);

export default logger
