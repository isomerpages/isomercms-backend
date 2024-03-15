import crypto from "crypto"

import jwtUtils, { decryptAesGcm, encryptAesGcm } from "@utils/jwt-utils"

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
    const secret = Buffer.from(crypto.randomBytes(16)).toString("hex")

    // Act
    const result = decryptAesGcm(encryptAesGcm(original, secret), secret)

    // Assert
    expect(result).toBe(original)
  })
})
