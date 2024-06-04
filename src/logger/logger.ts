import _ from "lodash"
import pino, { Logger as PinoLogger } from "pino"

import { StackFrame, get, parse } from "./stack-trace"

interface ChildBindings {
  module: string
  [key: string]: unknown
}

type MergingObject = {
  message: string
  meta?: Record<string, unknown>
}

type ErrorMergingObject = MergingObject & {
  error: unknown
}

export const MAX_STACK_DEPTH = 5

export interface TraceMeta {
  file: string
  line: number
  func: string
}

export const getTraceMeta = (frames: StackFrame[]): TraceMeta[] =>
  frames.slice(0, MAX_STACK_DEPTH).map((frame) => ({
    file: frame.getFileName(),
    line: frame.getLineNumber(),
    func: frame.getFunctionName(),
  }))

const isErrorMergingObject = (
  messageOrError: unknown
): messageOrError is ErrorMergingObject =>
  typeof messageOrError === "object" &&
  !!messageOrError &&
  "error" in messageOrError && // not checking type of error, it's still unknown
  "message" in messageOrError &&
  typeof messageOrError.message === "string"

export class Logger {
  _logger: PinoLogger

  constructor(logger: PinoLogger) {
    this._logger = logger
  }

  public child = (bindings: ChildBindings): Logger => {
    const child = this._logger.child(bindings)
    return new Logger(child)
  }

  public setBindings = (bindings: { [key: string]: unknown }): void => {
    this._logger.setBindings(bindings)
  }

  public error = (
    // NOTE: Giving type as `unknown` here
    // because when we do a `catch`,
    // the caught error will be of type `unknown`
    messageOrError: string | Error | ErrorMergingObject | unknown
  ): void => {
    if (typeof messageOrError === "string") {
      const stackTrace = getTraceMeta(get())

      this._logger.error({
        message: messageOrError,
        stackTrace,
      })
    } else if (messageOrError instanceof Error) {
      const stackFrames = parse(messageOrError)
      const stackTrace = getTraceMeta(stackFrames)

      this._logger.error({
        error: messageOrError,
        stackTrace,
      })
    } else if (isErrorMergingObject(messageOrError)) {
      const stackFrames =
        messageOrError.error instanceof Error
          ? parse(messageOrError.error)
          : get()
      const stackTrace = getTraceMeta(stackFrames)

      this._logger.error({
        ...messageOrError,
        stackTrace,
      })
    } else {
      const stackTrace = getTraceMeta(get())

      // NOTE: Not keying under `error` here because
      // there's no error given in either the property
      // or as the argument itself.
      this._logger.error({
        meta: messageOrError,
        stackTrace,
      })
    }
  }

  public info = (messageOrObject: string | MergingObject): void => {
    this._logger.info(messageOrObject)
  }

  public warn = (messageOrObject: string | MergingObject): void => {
    const stackTrace = getTraceMeta(get())

    if (typeof messageOrObject === "string") {
      this._logger.warn({
        message: messageOrObject,
        stackTrace,
      })
    } else {
      this._logger.warn({
        ...messageOrObject,
        stackTrace,
      })
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
