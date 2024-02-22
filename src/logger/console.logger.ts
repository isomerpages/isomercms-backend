import { ExtendedLogger } from "./logger.types"

// NOTE: See [here](https://talyian.github.io/ansicolors/)
// for an overview of the color codes.
// Do note that this functions by having the form:
// `{color code}{message}{reset code}`
// where %s is where the message gets injected
const COLORS = {
  FOREGROUND: {
    RED: "\x1b[31m%s\x1b[0m",
    GREEN: "\x1b[32m%s\x1b[0m",
    YELLOW: "\x1b[33m%s\x1b[0m",
    BLUE: "\x1b[34m%s\x1b[0m",
  },
  BACKGROUND: {
    RED: "\x1b[41m%s\x1b[0m",
  },
} as const

// eslint-disable-next-line import/prefer-default-export
export const consoleLogger: ExtendedLogger = {
  info: (message: string | Record<string, unknown>): void => {
    // NOTE: This adds RGB to our console logs
    console.log(COLORS.FOREGROUND.GREEN, message)
  },
  warn: (message: string | Record<string, unknown>): void => {
    console.warn(COLORS.FOREGROUND.YELLOW, message)
  },
  error: (message: string | Record<string, unknown>): void => {
    console.error(COLORS.FOREGROUND.RED, message)
  },
  debug: (message: string | Record<string, unknown>): void => {
    console.debug(COLORS.FOREGROUND.BLUE, message)
  },
  fatal: (message: string | Record<string, unknown>): void => {
    console.error(COLORS.BACKGROUND.RED, message)
  },
}
