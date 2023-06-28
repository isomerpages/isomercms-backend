import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

import { config } from "@config/config"

import { Brand } from "@root/types/util"

const ENCRYPTION_ALGORITHM = "aes-256-cbc"

export const encryptPassword = (
  password: string
): {
  encryptedPassword: string
  iv: string
} => {
  const SECRET_KEY = Buffer.from(
    config.get("aws.amplify.passwordSecretKey"),
    "hex"
  )
  const iv = randomBytes(16)
  const decipher = createCipheriv(ENCRYPTION_ALGORITHM, SECRET_KEY, iv)
  let encryptedPassword = decipher.update(password, "utf8", "hex")
  encryptedPassword += decipher.final("hex")
  return { encryptedPassword, iv: iv.toString("hex") }
}

// type-def of decrypted password, prevents assigning string to it
type DecryptedPassword = Brand<string, "DecryptedPassword">

export const decryptPassword = (
  encryptedPassword: string,
  iv: string
): DecryptedPassword => {
  const SECRET_KEY = Buffer.from(
    config.get("aws.amplify.passwordSecretKey"),
    "hex"
  )
  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    SECRET_KEY,
    Buffer.from(iv, "hex")
  )
  let decrypted = decipher.update(encryptedPassword, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted as DecryptedPassword
}
