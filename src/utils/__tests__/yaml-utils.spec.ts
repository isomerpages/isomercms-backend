import { sanitizedYamlParse, sanitizedYamlStringify } from "@utils/yaml-utils"

import {
  normalYamlString,
  maliciousYamlString,
  normalYamlObject,
  maliciousYamlObject,
} from "@fixtures/yaml-fixtures"

describe("Sanitized yaml utils test", () => {
  it("should parse a normal string into yaml content successfully", () => {
    expect(sanitizedYamlParse(normalYamlString)).toStrictEqual(normalYamlObject)
  })

  it("should parse a malicious string into sanitized yaml content successfully", () => {
    expect(sanitizedYamlParse(maliciousYamlString)).toStrictEqual(
      normalYamlObject
    )
  })

  it("should stringify normal yaml content into a string successfully", () => {
    expect(sanitizedYamlStringify(normalYamlObject)).toBe(normalYamlString)
  })

  it("should stringify malicious yaml content into a string successfully", () => {
    expect(sanitizedYamlStringify(maliciousYamlObject)).toBe(normalYamlString)
  })
})
