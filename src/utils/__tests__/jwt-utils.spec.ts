import crypto from "crypto"

import jwtUtils from "@utils/jwt-utils"

const { encryptToken, decryptToken } = jwtUtils

describe("jwt utils", () => {
  it("should encrypt and decrypt token using aes cbc", () => {
    // Arrange
    const original = "secret"
    const secret = crypto.randomBytes(16).toString("hex")

    // Act
    const result = decryptToken(encryptToken(original, secret), secret)

    // Assert
    expect(result).toBe(original)
  })
})
