import logger from "@root/logger/logger"

export default function createErrorAndLog<T extends Error>(
  ErrorType: new (errorMessage: string) => T,
  message: string
): T {
  logger.error(message)
  return new ErrorType(message)
}
