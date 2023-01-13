import DOMPurify from "isomorphic-dompurify"
import yaml from "yaml"

// Note: `yaml.parse()` and `yaml.stringify()` should not be used anywhere
// else in the codebase.
export const sanitizedYamlParse = (
  unparsedContent: string
): Record<string, unknown> => yaml.parse(DOMPurify.sanitize(unparsedContent))

export const sanitizedYamlStringify = (prestringifiedContent: object): string =>
  DOMPurify.sanitize(yaml.stringify(prestringifiedContent))
