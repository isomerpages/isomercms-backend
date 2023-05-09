// Import dependencies
const _ = require("lodash")
const { serializeError } = require("serialize-error")

// Import logger
const logger = require("@logger/logger")

function errorHandler(err, req, res, next) {
  if (!err) return next()
  const containsSensitiveInfo = _.isEmpty(err.request)
  const serialisedErr = serializeError(err)
  // NOTE: If the error is an axios error or a network error, it will have a response.
  // We only take the `body` section because `request` + `config`
  // might contain the auth token used, which is sensitive
  const sanitisedErr = containsSensitiveInfo
    ? _.omit(serialisedErr, ["request", "config"])
    : serialisedErr
  const errMsg = `${new Date()}: ${JSON.stringify(
    serializeError(sanitisedErr)
  )}`

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
  if (err.name === "PayloadTooLargeError") {
    // Error thrown by large payload is done by express
    logger.info(errMsg)
    return res.status(413).json({
      error: {
        name: err.name,
        code: 413,
        message: err.message,
      },
    })
  }
  logger.info(`Unrecognized internal server error: ${errMsg}`)
  return res.status(500).json({
    error: {
      code: 500,
      message: "Something went wrong",
    },
  })
}

module.exports = {
  errorHandler,
}
