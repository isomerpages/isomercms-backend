import _ from "lodash"
import pino, { Logger as PinoLogger } from "pino"

import { StackFrame, get, parse } from "./stack-trace"

interface WarnMeta {
  params: Record<string, unknown>
}

interface ErrorMeta {
  error: unknown
}

const MAX_STACK_DEPTH = 5

export interface TraceMeta {
  file: string
  line: number
  func: string
}

export const getTraceMeta = (frames: StackFrame[]): TraceMeta[] =>
  frames.map((frame) => ({
    file: frame.getFileName(),
    line: frame.getLineNumber(),
    func: frame.getFunctionName(),
  }))

export class Logger {
  _logger: PinoLogger

  constructor(logger: PinoLogger) {
    this._logger = logger
  }

  public child = (
    bindings: Record<string, unknown> & { module: string }
  ): Logger => {
    const child = this._logger.child(bindings)
    return new Logger(child)
  }

  public error = (
    message: string,
    meta?: WarnMeta & ErrorMeta & Record<string, unknown>
  ): void => {
    const stackFrames = meta?.error instanceof Error ? parse(meta.error) : get()
    const stackTrace = getTraceMeta(stackFrames.slice(0, MAX_STACK_DEPTH))

    this._logger.error(message, {
      isomer: {
        meta,
        stackTrace,
      },
    })
  }

  public info = (message: string, meta?: Record<string, unknown>): void => {
    if (_.isEmpty(meta)) {
      this._logger.info(message)
    } else {
      this._logger.info(message, {
        isomer: {
          meta,
        },
      })
    }
  }

  public warn = (
    message: string,
    meta?: WarnMeta & Record<string, unknown>
  ): void => {
    const stackFrames = get().slice(0, MAX_STACK_DEPTH)
    const stackTrace = getTraceMeta(stackFrames)

    this._logger.warn(message, {
      isomer: {
        meta,
        stackTrace,
      },
    })
  }
}

// NOTE: `pino` writes to `stdout` by default
// and this will get piped to our cloudwatch log group.
const baseLogger = new Logger(
  pino({
    errorKey: "error",
    messageKey: "message",
    formatters: {
      level: (label: string) => ({ level: label.toUpperCase() }),
    },
  })
  // NOTE: Cast so that consumers are forced to call `child`
  // and declare the module
)

export default baseLogger
