import { BaseIsomerError } from "@root/errors/BaseError"

// eslint-disable-next-line import/prefer-default-export
export const isError = (e: unknown): e is Error => e instanceof Error

export const isIsomerError = (e: unknown): e is BaseIsomerError =>
  isError(e) && !!(e as BaseIsomerError).isIsomerError
