import yaml from "yaml"

import { sanitizer } from "@services/utilServices/Sanitizer"

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

export const sanitizedYamlStringify = (prestringifiedContent: object): string =>
  yaml.stringify(prestringifiedContent, (key, value) =>
    typeof value === "string" && !!value ? sanitizer.sanitize(value) : value
  )
