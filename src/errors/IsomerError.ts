/* External representation of Isomer errors - passed to frontend client */
export interface IsomerExternalError {
  code: string
  message: string
}

/* Internal representation of Isomer errors - passed to log stream */
export interface IsomerInternalError {
  code: string
  message: string
  meta?: Record<string, unknown>
  componentCode: string
  fileCode: string
}

export const ComponentTypes = {
  Service: "S",
  Router: "R",
  Controller: "C",
  Model: "M",
  Util: "U",
  Other: "X",
}

export const FileCodes = {
  CollectionPageService: "001",
}

const getExternalCode = (
  componentCode: string,
  fileCode: string,
  errCode: string
): string => `${componentCode}-${fileCode}-${errCode}`

/* Namespace for Error functions */
export const IsomerError = {
  toExternalRepresentation: (e: IsomerInternalError): IsomerExternalError => ({
    code: getExternalCode(e.componentCode, e.fileCode, e.code),
    message: e.message,
  }),
  getLog: (error: IsomerInternalError): Record<string, unknown> => ({
    ...error,
  }),
}
