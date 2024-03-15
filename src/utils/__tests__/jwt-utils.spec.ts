import jwtUtils from "@utils/jwt-utils"

const { encryptToken, decryptToken } = jwtUtils

describe("jwt utils", () => {
  it("should encrypt and decrypt token using aes cbc", () => {
    // Arrange
    const original = "secret"

    // Act
    const result = decryptToken(encryptToken(original))

    // Assert
    expect(result).toBe(original)
  })
})
