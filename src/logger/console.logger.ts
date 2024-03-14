import pino from "pino"

import { PINO_OPTIONS } from "./constants"
import { ExtendedLogger } from "./logger.types"

// eslint-disable-next-line import/prefer-default-export
export const consoleLogger: ExtendedLogger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
  ...PINO_OPTIONS,
})
