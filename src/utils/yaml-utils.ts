import DOMPurify from "isomorphic-dompurify"
import yaml from "yaml"

export const sanitizedYamlParse = (unparsedContent: string): object =>
  yaml.parse(DOMPurify.sanitize(unparsedContent))

export const sanitizedYamlStringify = (prestringifiedContent: object): string =>
  DOMPurify.sanitize(yaml.stringify(prestringifiedContent))
