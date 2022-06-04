// Import dependencies
const { serializeError } = require("serialize-error")

// Import logger
const logger = require("@logger/logger")

function errorHandler(err, req, res, next) {
  if (!err) return next()
  const errMsg = `${new Date()}: ${JSON.stringify(serializeError(err))}`

  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get("env") === "development" ? err : {}

  // Error handling for custom errors
  if (err.isIsomerError) {
    logger.info(errMsg)
    return res.status(err.status).json({
      error: {
        name: err.name,
        code: err.status,
        message: err.message,
      },
    })
  }
  // Error handling for non-Isomer response errors
  if (err.name && err.message && err.status) {
    logger.info(`Internal server error: ${errMsg}`)
    return res.status(err.status).json({
      error: {
        name: err.name,
        code: err.status,
        message: err.message,
      },
    })
  }
  logger.info(`Unrecognized internal server error: ${errMsg}`)
  return res.status(500).json({
    error: {
      code: 500,
      message: `Something went wrong: ${err}`,
    },
  })
}

module.exports = {
  errorHandler,
}
