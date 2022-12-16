import { sanitizedYamlParse, sanitizedYamlStringify } from "@utils/yaml-utils"

import {
  normalYamlString,
  maliciousYamlString,
  normalYamlObject,
  maliciousYamlObject,
} from "@fixtures/yaml-fixtures"

describe("Sanitized yaml utils test", () => {
  it("should parse a normal string into yaml content successfully", async () => {
    expect(sanitizedYamlParse(normalYamlString)).toStrictEqual(normalYamlObject)
  })

  it("should parse a malicious string into sanitized yaml content successfully", async () => {
    expect(sanitizedYamlParse(maliciousYamlString)).toStrictEqual(
      normalYamlObject
    )
  })

  it("should stringify normal yaml content into a string successfully", async () => {
    expect(
      // Note: this is silly and annoying but DOMPurify removes the newline from the yaml string
      // so we need to add an additional newline to make the two strings match.
      `\n${sanitizedYamlStringify(normalYamlObject)}`
    ).toBe(normalYamlString)
  })

  it("should stringify malicious yaml content into a string successfully", async () => {
    expect(
      // Note: this is silly and annoying but DOMPurify removes the newline from the yaml string
      // so we need to add an additional newline to make the two strings match.
      `\n${sanitizedYamlStringify(maliciousYamlObject)}`
    ).toBe(normalYamlString)
  })
})
