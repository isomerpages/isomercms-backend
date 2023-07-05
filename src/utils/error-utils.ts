import logger from "@root/logger/logger"

export default function createErrorAndLog<T extends Error>(
  ErrorType: new (...params: any) => T,
  message: string,
  args?: any
): T {
  logger.error(message)
  return new ErrorType(message, ...args)
}
