import moment from "moment-timezone"

import { config } from "@root/config/config"

import CloudWatchLogger from "./cloudwatch.logger"
import { consoleLogger } from "./console.logger"
import {
  Loggable,
  ExtendedLogger,
  LogMethod,
  LoggerVariants,
  WithDebug,
  WithFatal,
} from "./logger.types"

const NODE_ENV = config.get("env")
const useCloudwatchLogger =
  NODE_ENV === "prod" || NODE_ENV === "vapt" || NODE_ENV === "staging"
const useConsoleLogger = !(NODE_ENV === "test")

const timestampGenerator = () =>
  moment().tz("Asia/Singapore").format("YYYY-MM-DD HH:mm:ss")

export class IsomerLogger implements ExtendedLogger {
  private loggers: LoggerVariants[]

  constructor() {
    this.loggers = []
  }

  private getStructuredMessage = (
    level: string,
    message: Loggable,
    additionalData?: object
  ): object => ({
    timestamp: timestampGenerator(),
    level,
    message: typeof message === "string" ? message : JSON.stringify(message),
    ...additionalData,
  })

  private emitLog(
    level: string,
    message: Loggable,
    additionalData?: object
  ): void {
    // Directly use the message if it's an object, otherwise, generate the structured message
    const structuredMessage =
      typeof message === "object" && !additionalData
        ? message // If message is already an object and there's no additionalData, use it directly.
        : this.getStructuredMessage(level, message, additionalData) // Otherwise, generate a structured message.

    this.loggers.forEach((logger: any) => {
      if (typeof logger[level] === "function") {
        logger[level](structuredMessage)
      }
    })
  }

  info = (message: Loggable, additionalData?: object): void => {
    this.emitLog("info", message, additionalData)
  }

  warn = (message: Loggable, additionalData?: object): void => {
    this.emitLog("warn", message, additionalData)
  }

  error = (message: Loggable, additionalData?: object): void => {
    this.emitLog("error", message, additionalData)
  }

  debug = (message: Loggable, additionalData?: object): void => {
    this.emitLog("debug", message, additionalData)
  }

  fatal = (message: Loggable, additionalData?: object): void => {
    this.emitLog("fatal", message, additionalData)
  }

  use(logger: LoggerVariants) {
    this.loggers.push(logger)
  }
}

const logger = new IsomerLogger()
if (useConsoleLogger) logger.use(consoleLogger)
if (useCloudwatchLogger) logger.use(new CloudWatchLogger())

export default logger
