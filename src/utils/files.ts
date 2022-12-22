export const getFileExt = (fileName: string): string | undefined =>
  fileName.split(".").shift()
