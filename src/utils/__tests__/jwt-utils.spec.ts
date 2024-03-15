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

  it("should encrypt and decrypt token using aes gcm", () => {
    // Arrange
    const original = "secret"

    // Act
    const result = decryptToken(
      encryptToken(original, "aes-256-gcm"),
      "aes-256-gcm"
    )

    // Assert
    expect(result).toBe(original)
  })
})
