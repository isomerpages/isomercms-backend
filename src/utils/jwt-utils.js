const crypto = require("crypto")

const jwt = require("jsonwebtoken")
const _ = require("lodash")

const { config } = require("@config/config")

const JWT_SECRET = config.get("auth.jwtSecret")
// const ENCRYPTION_SECRET = config.get("auth.encryptionSecret")
const ENCRYPTION_SECRET = Buffer.from(crypto.randomBytes(16)).toString("hex")
const AUTH_TOKEN_EXPIRY_MS = config.get("auth.tokenExpiry").toString()

const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 32

const jwtUtil = {
  decodeToken: _.wrap(jwt.decode, (decode, token) => decode(token)),
  verifyToken: _.wrap(jwt.verify, (verify, token) =>
    verify(token, JWT_SECRET, { algorithms: ["HS256"] })
  ),
  signToken: _.wrap(jwt.sign, (sign, content) =>
    sign(content, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: AUTH_TOKEN_EXPIRY_MS,
    })
  ),
  encryptToken: (token) => {
    // NOTE: The iv here is 16 characters long.
    // This is because we generate 8 random bytes (1 byte = 8 bits)
    // but hex is 4 bits per character..
    const iv = crypto.randomBytes(8).toString("hex")
    const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_SECRET, iv)
    let encrypted = cipher.update(token, "utf8", "base64")
    encrypted += cipher.final("base64")

    // NOTE: Auth tag is 32 chars long
    const authTag = cipher.getAuthTag().toString("hex")

    return `${iv}${authTag}${encrypted}`
  },
  decryptToken: (encrypted) => {
    const iv = encrypted.slice(0, IV_LENGTH)
    const authTag = Buffer.from(
      encrypted.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH),
      "hex"
    )
    const encryptedText = encrypted.slice(32 + 16)
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      ENCRYPTION_SECRET,
      iv
    )
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encryptedText, "base64", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  },
}

module.exports = jwtUtil
