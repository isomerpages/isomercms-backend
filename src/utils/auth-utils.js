const { config } = require("@config/config")

const NODE_ENV = config.get("env")

function isSecure() {
  return NODE_ENV !== "DEV" && NODE_ENV !== "LOCAL_DEV" && NODE_ENV !== "test"
}

module.exports = {
  isSecure,
}
