import logger from "@root/logger/logger"

export default function createErrorAndLog<T extends Error>(
  createError: (errorMessage: string, ...errorArgs: unknown[]) => T,
  message: string,
  ...args: unknown[]
): T {
  logger.error(message)
  return createError(message, ...args)
}
