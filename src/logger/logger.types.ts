export type Loggable = string | Record<string, unknown>

export interface LogMethod {
  (message: Loggable): void
}

export type Formatter = (message: string) => string

export interface Logger {
  info: LogMethod
  warn: LogMethod
  error: LogMethod
}

export type WithDebug<T extends Logger> = T & {
  debug: LogMethod
}

export type WithFatal<T extends Logger> = T & {
  fatal: LogMethod
}

export type ExtendedLogger = WithDebug<WithFatal<Logger>>

export type LoggerVariants =
  | WithDebug<Logger>
  | WithFatal<Logger>
  | Logger
  | ExtendedLogger
