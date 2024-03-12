import pino from "pino"

import { PINO_OPTIONS } from "./constants"

// NOTE: `pino` writes to `stdout` by default
// and this will get piped to our cloudwatch log group.
// eslint-disable-next-line import/prefer-default-export
export const pinoLogger = pino(PINO_OPTIONS)
