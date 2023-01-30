import {
  retrieveDataFromMarkdown,
  convertDataToMarkdown,
} from "@utils/markdown-utils"

import {
  normalMarkdownContent,
  maliciousMarkdownContent,
  normalJsonObject,
  maliciousJsonObject,
} from "@fixtures/markdown-fixtures"

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
})
