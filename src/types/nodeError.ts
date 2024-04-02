export function isErrnoException(obj: any): obj is NodeJS.ErrnoException {
  return (
    obj &&
    (typeof obj.errno === "number" || obj.errno === undefined) &&
    (typeof obj.code === "string" || obj.code === undefined) &&
    (typeof obj.path === "string" || obj.path === undefined) &&
    (typeof obj.syscall === "string" || obj.syscall === undefined)
  )
}
