const process = require("process")

const logger = require("@logger/logger")

const db = require("@database/models")

module.exports = async () => {
  try {
    await db.sequelize.authenticate()
    logger.info("Database connected.")
  } catch (err) {
    logger.error(`Unable to connect to database. Error: ${err.message}`)
    // Exit early if database connection cannot be established.
    process.exit(1)
  }
}
