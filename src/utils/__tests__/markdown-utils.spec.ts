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
  frontMatterWithSymbolAndHtmlBody,
  frontMatterWithSymbolAndHtml,
  frontMatterWithSymbolWithoutBodyAndHtml,
  escapedFrontMatterWithSymbolAndHtml,
  escapedFrontMatterWithSymbolAndHtmlBody,
  frontMatterWithSymbolAndBodyWithoutHtml,
  frontMatterWithSymbolAndHtmlAndBody,
  safeEscapedJson,
  frontMatterWithSymbolAndEscapedBody,
  encodedFrontmatterJson,
  HTML_COMMENT_TAG,
} from "@fixtures/markdown-fixtures"
import { sanitizer } from "@root/services/utilServices/Sanitizer"

describe("Sanitized markdown utils test", () => {
  describe("retrieveDataFromMarkdown", () => {
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

    it("should not html encode special characters in the frontmatter even when there is html but it should encode special characters in body", () => {
      expect(
        retrieveDataFromMarkdown(frontMatterWithSymbolAndHtmlAndBody)
      ).toStrictEqual(safeEscapedJson)
    })
  })

  describe("convertDataToMarkdown", () => {
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

    it("should stringify a JSON object containing encoded frontmatter into markdown content without encoded frontmatter", () => {
      const { frontMatter, pageContent } = encodedFrontmatterJson

      expect(convertDataToMarkdown(frontMatter, pageContent)).toBe(
        frontMatterWithSymbolAndEscapedBody
      )
    })
  })

  describe("sanitize", () => {
    it("should sanitize boolean tags with an empty string", () => {
      // NOTE: Setting a boolean attr to an empty string is equivalent
      // to it being true.
      // See the HTML spec: https://html.spec.whatwg.org/#boolean-attributes
      expect(sanitizer.sanitize(rawInstagramEmbedScript)).toBe(
        sanitizedInstagramEmbedScript
      )
    })

    it("should escape special characters in our frontmatter if there is html in the frontmatter", () => {
      expect(sanitizer.sanitize(frontMatterWithSymbolAndHtml)).toBe(
        escapedFrontMatterWithSymbolAndHtml
      )
    })

    it("should escape special characters in our frontmatter if there is html in the body", () => {
      expect(sanitizer.sanitize(frontMatterWithSymbolAndHtmlBody)).toBe(
        escapedFrontMatterWithSymbolAndHtmlBody
      )
    })

    it("should not escape special characters in our frontmatter if there is no html and no body", () => {
      expect(sanitizer.sanitize(frontMatterWithSymbolWithoutBodyAndHtml)).toBe(
        frontMatterWithSymbolWithoutBodyAndHtml
      )
    })

    it("should not escape special characters in our frontmatter if there is no html but there is body", () => {
      expect(sanitizer.sanitize(frontMatterWithSymbolAndBodyWithoutHtml)).toBe(
        frontMatterWithSymbolAndBodyWithoutHtml
      )
    })

    it("should inject a html comment tag when the string is empty", () => {
      expect(sanitizer.sanitize("")).toBe(HTML_COMMENT_TAG)
    })
  })
})
