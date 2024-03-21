import crypto from "crypto"

import AES from "crypto-js/aes"

import jwtUtils from "@utils/jwt-utils"

const { encryptToken, decryptToken } = jwtUtils

describe("jwt utils", () => {
  it("should encrypt and decrypt token using aes cbc", () => {
    // Arrange
    const original = "secret"
    const secret = crypto.randomBytes(20).toString("hex")

    // Act
    const result = decryptToken(encryptToken(original, secret), secret)

    // Assert
    expect(result).toBe(original)
  })

  it("should be mutually encryptable with the same secret and old library", () => {
    // Arrange
    const original = "secret"
    const secret = crypto.randomBytes(20).toString("hex")

    // Act
    const result = decryptToken(
      AES.encrypt(original, secret).toString(),
      secret
    )

    // Assert
    expect(result).toBe(original)
  })
})
