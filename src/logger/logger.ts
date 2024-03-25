import _ from "lodash"
import pino, { Logger as PinoLogger } from "pino"

import { StackFrame, get, parse } from "./stack-trace"

interface WarnMeta {
  params: Record<string, unknown>
}

export const MAX_STACK_DEPTH = 5

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
    // NOTE: Giving type as `unknown` here
    // because when we do a `catch`,
    // the caught error will be of type `unknown`
    messageOrError: unknown,
    meta?: WarnMeta & Record<string, unknown>
  ): void => {
    const stackFrames =
      messageOrError instanceof Error ? parse(messageOrError) : get()
    const stackTrace = getTraceMeta(stackFrames.slice(0, MAX_STACK_DEPTH))

    if (typeof messageOrError === "string") {
      this._logger.error(messageOrError, {
        meta,
        stackTrace,
      })
    } else {
      this._logger.error({
        error: messageOrError,
        meta: _.omit(meta, "error"),
        stackTrace,
      })
    }
  }

  public info = (message: string, meta?: Record<string, unknown>): void => {
    if (_.isEmpty(meta)) {
      this._logger.info(message)
    } else {
      this._logger.info(message, meta)
    }
  }

  public warn = (
    message: string,
    meta?: WarnMeta & Record<string, unknown>
  ): void => {
    const stackFrames = get().slice(0, MAX_STACK_DEPTH)
    const stackTrace = getTraceMeta(stackFrames)

    this._logger.warn(message, {
      meta,
      stackTrace,
    })
  }
}

// NOTE: `pino` writes to `stdout` by default
// and this will get piped to our cloudwatch log group.
const baseLogger = pino({
  errorKey: "error",
  messageKey: "message",
  formatters: {
    level: (label: string) => ({ level: label.toUpperCase() }),
  },
  hooks: {
    logMethod(inputArgs, method) {
      // NOTE: Pino expects `message` as the second argument
      // but in our present codebase,
      // we pass it as the first argument
      if (inputArgs.length >= 2) {
        const arg1 = inputArgs.shift()
        const arg2 = inputArgs.shift()
        return method.apply(this, [arg2, arg1, ...inputArgs])
      }
      return method.apply(this, inputArgs)
    },
  },
})

export default new Logger(baseLogger) as Pick<Logger, "child">
