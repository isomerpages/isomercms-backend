import {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} from "@utils/markdown-utils"

import {
  normalMarkdownContent,
  maliciousMarkdownContent,
  normalJsonObject,
  maliciousJsonObject,
  rawInstagramEmbedScript,
  sanitizedInstagramEmbedScript,
} from "@fixtures/markdown-fixtures"
import { sanitizer } from "@root/services/utilServices/Sanitizer"

describe("Sanitized markdown utils test", () => {
  it("should parse normal markdown content into an object successfully", () => {
    expect(retrieveDataFromMarkdown(normalMarkdownContent)).toStrictEqual(
      normalJsonObject
    )
  })

  it("should parse malicious markdown content into a sanitized object successfully", () => {
    expect(retrieveDataFromMarkdown(maliciousMarkdownContent)).toStrictEqual(
      normalJsonObject
    )
  })

  it("should stringify a normal JSON object into markdown content successfully", () => {
    const { frontMatter, pageContent } = normalJsonObject
    expect(convertDataToMarkdown(frontMatter, pageContent)).toBe(
      normalMarkdownContent
    )
  })

  it("should stringify a malicious JSON object into sanitized markdown content successfully", () => {
    const { frontMatter, pageContent } = maliciousJsonObject
    expect(convertDataToMarkdown(frontMatter, pageContent)).toBe(
      normalMarkdownContent
    )
  })

  it("should sanitize boolean tags with an empty string", () => {
    // NOTE: Setting a boolean attr to an empty string is equivalent
    // to it being true.
    // See the HTML spec: https://html.spec.whatwg.org/#boolean-attributes
    expect(sanitizer.sanitize(rawInstagramEmbedScript)).toBe(
      sanitizedInstagramEmbedScript
    )
  })
})
