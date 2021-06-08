const jwt = require("jsonwebtoken")
const _ = require("lodash")

const { JWT_SECRET } = process.env
const AUTH_TOKEN_EXPIRY_MS = process.env.AUTH_TOKEN_EXPIRY_DURATION_IN_MILLISECONDS.toString()

const jwtUtil = {
  verifyToken: _.wrap(jwt.verify, (verify, token) =>
    verify(token, JWT_SECRET, { algorithms: ["HS256"] })
  ),
  signToken: _.wrap(jwt.sign, (sign, content) =>
    sign(content, JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: AUTH_TOKEN_EXPIRY_MS,
    })
  ),
}

module.exports = jwtUtil
