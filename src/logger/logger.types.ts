export interface LogMethod {
  (message: string | Record<string, unknown>): void
}

export type Formatter = (message: string) => string

export interface Logger {
  info: LogMethod
  warn: LogMethod
  error: LogMethod
}
