import yaml from "yaml"

import { sanitizer } from "@services/utilServices/Sanitizer"

// Note: `yaml.parse()` and `yaml.stringify()` should not be used anywhere
// else in the codebase.
export const sanitizedYamlParse = (
  unparsedContent: string
): Record<string, unknown> => yaml.parse(sanitizer.sanitize(unparsedContent))

export const sanitizedYamlStringify = (prestringifiedContent: object): string =>
  sanitizer.sanitize(yaml.stringify(prestringifiedContent))
