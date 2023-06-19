export const ComponentTypes = {
  Service: "S",
  Router: "R",
  Controller: "C",
  Model: "M",
  Util: "U",
  Other: "X",
} as const

export type PossibleComponentTypes = typeof ComponentTypes[keyof typeof ComponentTypes]

export const FileCodes = {
  CollectionPageService: "001",
  Undefined: "000",
} as const

export type PossibleFileCodes = typeof FileCodes[keyof typeof FileCodes]

type ExternalCode = `${PossibleComponentTypes}-${PossibleFileCodes}-${string}`

/* External representation of Isomer errors - passed to frontend client */
export interface IsomerExternalError {
  code: ExternalCode
  message: string
}

/* Internal representation of Isomer errors - passed to log stream */
export interface IsomerInternalError {
  code: string
  message: string
  meta?: Record<string, unknown>
}

export interface IdentifiableError {
  componentCode: PossibleComponentTypes
  fileCode: PossibleFileCodes
}

const getExternalCode = (
  componentCode: PossibleComponentTypes,
  fileCode: PossibleFileCodes,
  errCode: string
): ExternalCode => `${componentCode}-${fileCode}-${errCode}`

/* Namespace for Error functions */
export const IsomerError = {
  toExternalRepresentation: <E extends IsomerInternalError & IdentifiableError>(
    e: E
  ): IsomerExternalError => ({
    code: getExternalCode(e.componentCode, e.fileCode, e.code),
    message: e.message,
  }),
  getLog: (error: IsomerInternalError): Record<string, unknown> => ({
    ...error,
  }),
}
