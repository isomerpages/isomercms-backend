const { config } = require("@config/config")

const NODE_ENV = config.get("env")

const isSecure = NODE_ENV !== "dev" && NODE_ENV !== "test"

// FIXME: This makes a strong assumption that the app is always behind
// Cloudflare, but may not necessarily be the case when Cloudflare is disabled.
// Fix this to fallback to other headers or req.ip if Cloudflare headers are not
// present.
const getUserIPAddress = (req) =>
  isSecure ? req.get("cf-connecting-ip") : req.ip

module.exports = {
  isSecure,
  getUserIPAddress,
}
