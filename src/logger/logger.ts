import CloudWatchLogger from "./cloudwatch.logger"
import { consoleLogger } from "./console.logger"
import { ExtendedLogger, LoggerVariants } from "./logger.types"

const NODE_ENV = process.env.NODE_ENV || "development"
const useCloudwatchLogger =
  NODE_ENV === "prod" || NODE_ENV === "vapt" || NODE_ENV === "staging"
const useConsoleLogger = !(NODE_ENV === "test")

export class IsomerLogger implements ExtendedLogger {
  private loggers: LoggerVariants[]

  constructor() {
    this.loggers = []
    if (useConsoleLogger) this.use(consoleLogger)
    if (useCloudwatchLogger) this.use(new CloudWatchLogger())
  }

  private emitLog(level: string, message: string | object): void {
    this.loggers.forEach((logger: any) => {
      if (typeof logger[level] === "function") {
        logger[level](message)
      }
    })
  }

  info = (message: string | object): void => this.emitLog("info", message)

  warn = (message: string | object): void => this.emitLog("warn", message)

  error = (message: string | object): void => this.emitLog("error", message)

  debug = (message: string | object): void => this.emitLog("debug", message)

  fatal = (message: string | object): void => this.emitLog("fatal", message)

  use(logger: LoggerVariants) {
    this.loggers.push(logger)
  }
}

export default new IsomerLogger()
