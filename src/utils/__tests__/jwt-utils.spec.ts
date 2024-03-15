import { encryptToken, decryptToken } from "@utils/jwt-utils"

describe("jwt utils", () => {
  it("should encrypt and decrypt token", () => {
    // Arrange
    const original = "secret"

    // Act
    const result = decryptToken(encryptToken(original))

    // Assert
    expect(result).toBe(original)
  })
})
