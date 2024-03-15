import crypto from "crypto"

import jwt from "jsonwebtoken"
import _ from "lodash"

import { config } from "@config/config"

const JWT_SECRET = config.get("auth.jwtSecret")
const ENCRYPTION_SECRET = config.get("auth.encryptionSecret")
const AUTH_TOKEN_EXPIRY_MS = config.get("auth.tokenExpiry").toString()

const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 32

export default {
  decodeToken: _.wrap(jwt.decode, (decode, token: string) => decode(token)),
  verifyToken: _.wrap(jwt.verify, (verify, token: string) =>
    verify(token, JWT_SECRET, { algorithms: ["HS256"] })
  ),
  signToken: _.wrap(jwt.sign, (sign, content: string) =>
    sign(content, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: AUTH_TOKEN_EXPIRY_MS,
    })
  ),
  encryptToken: (token: string, secret?: string) => {
    const encryptionSecret = secret ?? ENCRYPTION_SECRET.slice(0, 32)

    // NOTE: The iv here is 16 characters long.
    // This is because we generate 8 random bytes (1 byte = 8 bits)
    // but hex is 4 bits per character..
    const iv = crypto.randomBytes(8).toString("hex")
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      // NOTE: Production encryption secret is 40 characters long,
      // which is invalid for aes gcm.
      // The secret has to be exactly 32 characters (256 bits) long.
      encryptionSecret,
      iv
    )
    let encrypted = cipher.update(token, "utf8", "base64")
    encrypted += cipher.final("base64")

    // NOTE: Auth tag is 32 chars long
    const authTag = cipher.getAuthTag().toString("hex")

    return `${iv}${authTag}${encrypted}`
  },
  decryptToken: (encrypted: string, secret?: string) => {
    const encryptionSecret = secret ?? ENCRYPTION_SECRET.slice(0, 32)

    const iv = encrypted.slice(0, IV_LENGTH)
    const authTag = Buffer.from(
      encrypted.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH),
      "hex"
    )
    const encryptedText = encrypted.slice(32 + 16)
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      // NOTE: Production encryption secret is 40 characters long,
      // which is invalid for aes gcm.
      // The secret has to be exactly 32 characters (256 bits) long.
      encryptionSecret,
      iv
    )
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encryptedText, "base64", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  },
}
