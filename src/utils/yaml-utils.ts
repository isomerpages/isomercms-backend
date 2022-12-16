import DOMPurify from "isomorphic-dompurify"
import yaml from "yaml"

export const sanitizedYamlParse = (unparsedContent: string) =>
  yaml.parse(DOMPurify.sanitize(unparsedContent))

export const sanitizedYamlStringify = (prestringifiedContent: object) =>
  DOMPurify.sanitize(yaml.stringify(prestringifiedContent))
