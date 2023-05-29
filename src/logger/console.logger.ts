import { Logger } from "./logger.types"

// eslint-disable-next-line import/prefer-default-export
export const consoleLogger: Logger = {
  info: (message: string): void => {
    // NOTE: This adds RGB to our console logs
    console.log("\x1b[32m%s\x1b[0m", `[INFO]: ${message}`)
  },
  warn: (message: string): void => {
    console.warn("\x1b[33m%s\x1b[0m", `[WARN]: ${message}`)
  },
  error: (message: string): void => {
    console.error("\x1b[1;31m%s\x1b[0m", `[ERROR]: ${message}`)
  },
}
