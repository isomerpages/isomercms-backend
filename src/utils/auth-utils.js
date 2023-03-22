const { config } = require("@config/config")

const NODE_ENV = config.get("env").toLowerCase()

function isSecure() {
  return NODE_ENV !== "dev" && NODE_ENV !== "staging" && NODE_ENV !== "test"
}

module.exports = {
  isSecure,
}
