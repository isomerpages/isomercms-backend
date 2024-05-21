import yaml from "yaml"

import { sanitizer } from "@services/utilServices/Sanitizer"

const LINE_BREAK_REGEX = "[\r\n\x0B\x0C\u0085\u2028\u2029]"
const GLOBAL_LINE_BREAK_SEARCH = new RegExp(LINE_BREAK_REGEX, "gi")

type RecursiveInput =
  | string
  | RecursiveInput[]
  | { [key: string]: RecursiveInput }
  | undefined
  | null

export const recursiveTrimAndReplaceLineBreaks = (
  obj: RecursiveInput
): RecursiveInput => {
  if (typeof obj === "string") {
    return obj.replaceAll(GLOBAL_LINE_BREAK_SEARCH, " ").trim()
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => recursiveTrimAndReplaceLineBreaks(item))
  }
  if (typeof obj === "object" && obj !== null) {
    const newObj: RecursiveInput = {}
    Object.keys(obj).forEach((key) => {
      newObj[key] = recursiveTrimAndReplaceLineBreaks(obj[key])
    })
    return newObj
  }
  return obj
}

// Note: `yaml.parse()` and `yaml.stringify()` should not be used anywhere
// else in the codebase.
export const sanitizedYamlParse = (
  unparsedContent: string
): Record<string, unknown> =>
  yaml.parse(unparsedContent, (key, value) =>
    typeof value === "string" && !!value
      ? // NOTE: We call `trim` here because post-sanitization,
        // there could be an extra space.
        // For example: `logo: path <script />`,
        // which will be sanitized with a trailing space.
        sanitizer.sanitize(value).trim()
      : value
  )

export const sanitizedYamlStringify = (
  prestringifiedContent: RecursiveInput
): string => {
  const formattedPrestringifiedContent = recursiveTrimAndReplaceLineBreaks(
    prestringifiedContent
  )
  return yaml.stringify(formattedPrestringifiedContent, (key, value) =>
    typeof value === "string" && !!value ? sanitizer.sanitize(value) : value
  )
}
