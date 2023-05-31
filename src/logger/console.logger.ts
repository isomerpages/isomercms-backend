import { Logger } from "./logger.types"

const COLORS = {
  RED: "\x1b[1;31m%s\x1b[0m",
  GREEN: "\x1b[32m%s\x1b[0m",
  YELLOW: "\x1b[33m%s\x1b[0m",
} as const

// eslint-disable-next-line import/prefer-default-export
export const consoleLogger: Logger = {
  info: (message: string | Record<string, unknown>): void => {
    // NOTE: This adds RGB to our console logs
    console.log(COLORS.GREEN, `[INFO]: ${message}`)
  },
  warn: (message: string | Record<string, unknown>): void => {
    console.warn(COLORS.YELLOW, `[WARN]: ${message}`)
  },
  error: (message: string | Record<string, unknown>): void => {
    console.error(COLORS.RED, `[ERROR]: ${message}`)
  },
}
