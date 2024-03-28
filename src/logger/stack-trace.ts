// NOTE: This is taken with reference from: https://github.com/felixge/node-stack-trace/blob/master/index.js
// As the library itself is ESM, we require a dynamic import in order for it to work with our codebase,
// which emits CJS.
// This means that our logger has to be a `Promise`, which is not ideal.
// Hence, all code in this file is strictly copy-pasted from the original source
// and only types have been added.

export interface StackFrame {
  getTypeName(): string
  getFunctionName(): string
  getMethodName(): string
  getFileName(): string
  getLineNumber(): number
  getColumnNumber(): number
  isNative(): boolean
  isConstructor(): boolean
}

interface CallSiteProps {
  fileName: string | null
  lineNumber: number | null
  functionName: string | null
  typeName: string | null
  methodName: string | null
  columnNumber: number | null
  native: boolean | null
}

export function get(): StackFrame[] {
  const oldLimit = Error.stackTraceLimit
  Error.stackTraceLimit = Infinity

  const dummyObject: Pick<Error, "stack"> = {}

  const v8Handler = Error.prepareStackTrace
  Error.prepareStackTrace = function (dummyObject, v8StackTrace) {
    return v8StackTrace
  }
  Error.captureStackTrace(dummyObject, get)

  const v8StackTrace = dummyObject.stack
  Error.prepareStackTrace = v8Handler
  Error.stackTraceLimit = oldLimit

  return (v8StackTrace as unknown) as StackFrame[]
}

export function parse(err: Error): StackFrame[] {
  if (!err.stack) {
    return []
  }

  const lines = err.stack
    .split("\n")
    .slice(1)
    .map((line) => {
      if (line.match(/^\s*[-]{4,}$/)) {
        return createParsedCallSite({
          fileName: line,
          lineNumber: null,
          functionName: null,
          typeName: null,
          methodName: null,
          columnNumber: null,
          native: null,
        })
      }

      const lineMatch = line.match(
        /at (?:(.+?)\s+\()?(?:(.+?):(\d+)(?::(\d+))?|([^)]+))\)?/
      )
      if (!lineMatch) {
        return
      }

      let object = null
      let method = null
      let functionName = null
      let typeName = null
      let methodName = null
      const isNative = lineMatch[5] === "native"

      if (lineMatch[1]) {
        functionName = lineMatch[1]
        let methodStart = functionName.lastIndexOf(".")
        if (functionName[methodStart - 1] === ".") methodStart--
        if (methodStart > 0) {
          object = functionName.substr(0, methodStart)
          method = functionName.substr(methodStart + 1)
          const objectEnd = object.indexOf(".Module")
          if (objectEnd > 0) {
            functionName = functionName.substr(objectEnd + 1)
            object = object.substr(0, objectEnd)
          }
        }
      }

      if (method) {
        typeName = object
        methodName = method
      }

      if (method === "<anonymous>") {
        methodName = null
        functionName = null
      }

      const properties = {
        fileName: lineMatch[2] || null,
        lineNumber: parseInt(lineMatch[3], 10) || null,
        functionName,
        typeName,
        methodName,
        columnNumber: parseInt(lineMatch[4], 10) || null,
        native: isNative,
      }

      return createParsedCallSite(properties)
    })
    .filter((callSite) => !!callSite)

  return lines as StackFrame[]
}

function CallSite(properties: CallSiteProps) {
  for (const property in properties) {
    // @ts-ignore

    this[property] = properties[property]
  }
}

const strProperties = [
  "this",
  "typeName",
  "functionName",
  "methodName",
  "fileName",
  "lineNumber",
  "columnNumber",
  "function",
  "evalOrigin",
]

const boolProperties = ["topLevel", "eval", "native", "constructor"]

strProperties.forEach((property) => {
  CallSite.prototype[property] = null
  CallSite.prototype[
    `get${property[0].toUpperCase()}${property.substr(1)}`
  ] = function () {
    return this[property]
  }
})

boolProperties.forEach((property) => {
  CallSite.prototype[property] = false
  CallSite.prototype[
    `is${property[0].toUpperCase()}${property.substr(1)}`
  ] = function () {
    return this[property]
  }
})

function createParsedCallSite(properties: CallSiteProps): StackFrame {
  // @ts-ignore
  return new CallSite(properties)
}
