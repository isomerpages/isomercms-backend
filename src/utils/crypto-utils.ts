import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "crypto"

import { Brand } from "@root/types/util"

const ENCRYPTION_ALGORITHM = "aes-256-cbc"

export const generateUuid = () => randomUUID()

export const encryptPassword = (
  password: string,
  key: string
): {
  encryptedPassword: string
  iv: string
} => {
  const secretKey = Buffer.from(key, "hex")
  const iv = randomBytes(16)
  const decipher = createCipheriv(ENCRYPTION_ALGORITHM, secretKey, iv)
  let encryptedPassword = decipher.update(password, "utf8", "hex")
  encryptedPassword += decipher.final("hex")
  return { encryptedPassword, iv: iv.toString("hex") }
}

// type-def of decrypted password, prevents assigning string to it
type DecryptedPassword = Brand<string, "DecryptedPassword">

export const decryptPassword = (
  encryptedPassword: string,
  iv: string,
  key: string
): DecryptedPassword => {
  const secretKey = Buffer.from(key, "hex")
  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    secretKey,
    Buffer.from(iv, "hex")
  )
  let decrypted = decipher.update(encryptedPassword, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted as DecryptedPassword
}
