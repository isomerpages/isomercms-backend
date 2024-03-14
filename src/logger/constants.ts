import pino from "pino"

// eslint-disable-next-line import/prefer-default-export
export const PINO_OPTIONS = {
  // NOTE: DO NOT format time in-process
  // as this will affect perf of the logger.
  // See here: https://getpino.io/#/docs/api?id=timestamp-boolean-function
  timestamp: pino.stdTimeFunctions.isoTime,
  errorKey: "error",
  messageKey: "message",
  formatters: {
    level: (label: string) => ({ level: label.toUpperCase() }),
  },
}
