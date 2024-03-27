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

const hasErrorProp = (
  messageOrError: unknown
): messageOrError is { error: Error } =>
  typeof messageOrError === "object" &&
  !!messageOrError &&
  "error" in messageOrError

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
    messageOrError: unknown
  ): void => {
    if (typeof messageOrError === "string") {
      const stackFrames = get()
      const stackTrace = getTraceMeta(stackFrames.slice(0, MAX_STACK_DEPTH))

      this._logger.error(
        {
          stackTrace,
        },
        messageOrError
      )
    } else if (messageOrError instanceof Error) {
      const stackFrames = parse(messageOrError)
      const stackTrace = getTraceMeta(stackFrames.slice(0, MAX_STACK_DEPTH))

      this._logger.error({
        error: messageOrError,
        stackTrace,
      })
    } else if (hasErrorProp(messageOrError)) {
      const stackFrames = parse(messageOrError?.error)
      const stackTrace = getTraceMeta(stackFrames.slice(0, MAX_STACK_DEPTH))

      this._logger.error({
        error: messageOrError.error,
        meta: _.omit(messageOrError, "error"),
        stackTrace,
      })
    } else {
      const stackFrames = get()
      const stackTrace = getTraceMeta(stackFrames.slice(0, MAX_STACK_DEPTH))

      // NOTE: Not keying under `error` here because
      // there's no error given in either the property
      // or as the argument itself.
      this._logger.error({ meta: messageOrError, stackTrace })
    }
  }

  public info = (
    messageOrObject: string | (Record<string, unknown> & { message: string })
  ): void => {
    if (typeof messageOrObject === "string") {
      this._logger.info(messageOrObject)
    } else {
      const meta = _.omit(messageOrObject, "message")
      this._logger.info({ meta }, messageOrObject.message)
    }
  }

  public warn = (
    messageOrObject:
      | string
      | (WarnMeta & Record<string, unknown> & { message: string })
  ): void => {
    const stackFrames = get().slice(0, MAX_STACK_DEPTH)
    const stackTrace = getTraceMeta(stackFrames)

    if (typeof messageOrObject === "string") {
      this._logger.warn(
        {
          stackTrace,
        },
        messageOrObject
      )
    } else {
      const meta = _.omit(messageOrObject, "message")
      this._logger.warn(
        {
          meta,
          stackTrace,
        },
        messageOrObject.message
      )
    }
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
})

export default new Logger(baseLogger)
