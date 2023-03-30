const { config } = require("@config/config")

const NODE_ENV = config.get("env")

const isSecure = NODE_ENV !== "dev" && NODE_ENV !== "test"

module.exports = {
  isSecure,
}
