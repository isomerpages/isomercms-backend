import yaml from "yaml"

import { sanitizer } from "@services/utilServices/Sanitizer"

// Note: `yaml.parse()` and `yaml.stringify()` should not be used anywhere
// else in the codebase.
export const sanitizedYamlParse = (
  unparsedContent: string
): Record<string, unknown> =>
  yaml.parse(unparsedContent, (key, value) =>
    typeof value === "string" ? sanitizer.sanitize(value) : value
  )

export const sanitizedYamlStringify = (prestringifiedContent: object): string =>
  yaml.stringify(prestringifiedContent, (key, value) =>
    typeof value === "string" ? sanitizer.sanitize(value) : value
  )
