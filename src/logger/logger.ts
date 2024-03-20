import pino, { Logger as PinoLogger } from "pino"
import { StackFrame, get } from "stack-trace"

interface WarnMeta {
  params: Record<string, unknown>
}

interface ErrorMeta {
  error: Error
}

const MAX_STACK_DEPTH = 3

interface TraceMeta {
  file: string
  line: number
  func: string
  method: string
}

const getTraceMeta = (frames: StackFrame[]): TraceMeta[] =>
  frames.map((frame) => ({
    file: frame.getFileName(),
    line: frame.getLineNumber(),
    func: frame.getFunctionName(),
    method: frame.getMethodName(),
  }))

class Logger {
  private logger: PinoLogger

  constructor(logger: PinoLogger) {
    this.logger = logger
  }

  public child = (
    bindings: Record<string, unknown> & { module: string }
  ): Logger => {
    const child = this.logger.child(bindings)
    return new Logger(child)
  }

  public error = (
    message: string,
    meta: WarnMeta & ErrorMeta & Record<string, unknown>
  ): void => {
    const stackFrames = get().slice(MAX_STACK_DEPTH)
    const trace = getTraceMeta(stackFrames)

    this.logger.error(message, {
      isomer: {
        meta,
        trace,
      },
    })
  }

  public info = (message: string, meta: Record<string, unknown>): void => {
    this.logger.info(message, {
      isomer: {
        meta,
      },
    })
  }

  public warn = (
    message: string,
    meta: WarnMeta & Record<string, unknown>
  ): void => {
    const stackFrames = get().slice(MAX_STACK_DEPTH)
    const trace = getTraceMeta(stackFrames)

    this.logger.warn(message, {
      isomer: {
        meta,
        trace,
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
) as Pick<Logger, "child">

export default baseLogger
