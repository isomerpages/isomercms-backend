import { encryptPassword, decryptPassword } from "../crypto-utils"

describe("Crypto utils test", () => {
  const UNENCRYPTED_PASSWORD = "password"
  const SECRET_KEY =
    "1234567812345678123456781234567812345678123456781234567812345678"
  const { encryptedPassword: ENCRYPTED_PASSWORD, iv: IV } = encryptPassword(
    UNENCRYPTED_PASSWORD,
    SECRET_KEY
  )

  it("should have encrypted and decrypted passwords match", async () => {
    const decrypted = decryptPassword(ENCRYPTED_PASSWORD, IV, SECRET_KEY)

    expect(decrypted).toEqual(UNENCRYPTED_PASSWORD)
  })

  it("should have wrong IV throw error", async () => {
    const fakeIv = "12345678901234561234567890123456"
    const throws = () => decryptPassword(ENCRYPTED_PASSWORD, fakeIv, SECRET_KEY)
    expect(throws).toThrow()
  })
})
