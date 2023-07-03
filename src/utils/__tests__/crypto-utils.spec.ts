import { encryptPassword, decryptPassword } from "../crypto-utils"

describe("Crypto utils test", () => {
  const UNENCRYPTED_PASSWORD = "password"
  const { encryptedPassword: ENCRYPTED_PASSWORD, iv: IV } = encryptPassword(
    UNENCRYPTED_PASSWORD
  )

  it("should have encrypted and decrypted passwords match", async () => {
    const decrypted = decryptPassword(ENCRYPTED_PASSWORD, IV)

    expect(decrypted).toEqual(UNENCRYPTED_PASSWORD)
  })

  it("should have invalid IV throw error", async () => {
    const fakeIv = "12345678901234561234567890123456"
    try {
      decryptPassword(ENCRYPTED_PASSWORD, fakeIv)
    } catch (e) {
      return
    }
    fail()
  })

  it("should not match if different password is given", async () => {
    const fakePassword = "fake"
    const actualPassword = decryptPassword(ENCRYPTED_PASSWORD, IV)
    expect(actualPassword).not.toEqual(fakePassword)
  })
})
