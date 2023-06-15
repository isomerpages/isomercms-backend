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
  componentCode?: string
  fileCode?: string
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

const getErrCode = (
  componentCode: string,
  fileCode: string,
  seqNum: number
): string => `${componentCode}${fileCode}-${seqNum}`

/* Namespace for Error functions */
export const IsomerError = {
  // TODO: Once we start implementing errors, we need to define the codes in the error files
  toExternalRepresentation: (e: IsomerInternalError): IsomerExternalError => ({
    code: e.code,
    message: e.message,
  }),
  getLog: (error: IsomerInternalError): Record<string, unknown> => ({
    ...error,
  }),
}
