import { ExtendedLogger, Loggable } from "./logger.types"

// Helper function to format a log message as a single-line JSON string.
const formatLogMessage = (level: string, message: Loggable): string => {
  const formattedMessage =
    typeof message === "object" ? JSON.stringify(message) : message
  return formattedMessage
}

export const consoleLogger: ExtendedLogger = {
  info: (message: Loggable): void => {
    console.log(formatLogMessage("info", message))
  },
  warn: (message: Loggable): void => {
    console.warn(formatLogMessage("warn", message))
  },
  error: (message: Loggable): void => {
    console.error(formatLogMessage("error", message))
  },
  debug: (message: Loggable): void => {
    console.debug(formatLogMessage("debug", message))
  },
  fatal: (message: Loggable): void => {
    console.error(formatLogMessage("fatal", message))
  },
}
