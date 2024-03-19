import crypto from "crypto"

import jwt from "jsonwebtoken"
import _ from "lodash"

import { config } from "@config/config"

const JWT_SECRET = config.get("auth.jwtSecret")
const ENCRYPTION_SECRET = config.get("auth.encryptionSecret")
const AUTH_TOKEN_EXPIRY_MS = config.get("auth.tokenExpiryInMs").toString()

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
    const encryptionSecret = secret ?? ENCRYPTION_SECRET

    const cipher = crypto.createCipher(
      "aes-256-cbc",
      // NOTE: Production encryption secret is 40 characters long,
      // which is invalid for aes gcm.
      // The secret has to be exactly 32 characters (256 bits) long.
      encryptionSecret
    )
    let encrypted = cipher.update(token, "utf8", "base64")
    encrypted += cipher.final("base64")

    return encrypted
  },
  decryptToken: (encrypted: string, secret?: string) => {
    const encryptionSecret = secret ?? ENCRYPTION_SECRET

    const decipher = crypto.createDecipher(
      "aes-256-cbc",
      // NOTE: Production encryption secret is 40 characters long,
      // which is invalid for aes gcm.
      // The secret has to be exactly 32 characters (256 bits) long.
      encryptionSecret
    )
    let decrypted = decipher.update(encrypted, "base64", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  },
}
