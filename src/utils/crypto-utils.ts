import { createDecipheriv } from "crypto"

import { config } from "@config/config"

const ALGORITHM = "aes-256-cbc"

export const decryptPassword = (encryptedPassword: string, iv: string) => {
  const SECRET_KEY = Buffer.from(
    config.get("aws.amplify.passwordSecretKey"),
    "hex"
  )
  const decipher = createDecipheriv(
    ALGORITHM,
    SECRET_KEY,
    Buffer.from(iv, "hex")
  )
  let decrypted = decipher.update(encryptedPassword, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}
