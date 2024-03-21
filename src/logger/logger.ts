import pino from "pino"

// NOTE: `pino` writes to `stdout` by default
// and this will get piped to our cloudwatch log group.
// eslint-disable-next-line import/prefer-default-export
export default pino({
  errorKey: "error",
  messageKey: "message",
  formatters: {
    level: (label: string) => ({ level: label.toUpperCase() }),
  },
})
