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
