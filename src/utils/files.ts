export const getFileExt = (fileName: string): string =>
  // NOTE: will never be `undefined` as `fileName` is guaranteed to be a string
  fileName.split(".").pop()!
