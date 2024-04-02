/* eslint-disable import/prefer-default-export */
export function isErrnoException(obj: unknown): obj is NodeJS.ErrnoException {
  const err = obj as NodeJS.ErrnoException
  return (
    err &&
    (typeof err.errno === "number" || err.errno === undefined) &&
    (typeof err.code === "string" || err.code === undefined) &&
    (typeof err.path === "string" || err.path === undefined) &&
    (typeof err.syscall === "string" || err.syscall === undefined)
  )
}
