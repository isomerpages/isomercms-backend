const CryptoJS = require("crypto-js")
const AES = require("crypto-js/aes")
const jwt = require("jsonwebtoken")
const _ = require("lodash")

const { JWT_SECRET } = process.env
const { ENCRYPTION_SECRET } = process.env
const AUTH_TOKEN_EXPIRY_MS = process.env.AUTH_TOKEN_EXPIRY_DURATION_IN_MILLISECONDS.toString()

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
  encryptToken: _.wrap(AES.encrypt, (encrypt, token) =>
    encrypt(token, ENCRYPTION_SECRET).toString()
  ),
  decryptToken: _.wrap(AES.decrypt, (decrypt, token) =>
    decrypt(token, ENCRYPTION_SECRET).toString(CryptoJS.enc.Utf8)
  ),
}

module.exports = jwtUtil
