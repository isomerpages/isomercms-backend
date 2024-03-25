// Import dependencies
const { IsomerError } = require("@root/errors/IsomerError")

const _ = require("lodash")
const { serializeError } = require("serialize-error")

// Import logger
const baseLogger = require("@logger/logger").default

const logger = baseLogger.child({ module: "errorHandler" })

function errorHandler(err, req, res, next) {
  if (!err) return next()
  const containsSensitiveInfo = !_.isEmpty(err.config?.headers?.Authorization)
  const serialisedErr = serializeError(err)
  // NOTE: If the error is an axios error or a network error,
  // the token used (if any) will be present on `request` + `config`.
  // Hence, we omit both of these and only pick the selected properties.
  // This is also to avoid picking the `session`, which has raws bytes
  // that is not useful to debugging
  const sanitisedErr = containsSensitiveInfo
    ? {
        // NOTE: Default error properties
        ..._.pick(serialisedErr, ["name", "message", "stack"]),
        ..._.pick(serialisedErr.response, ["headers", "data", "status"]),
      }
    : serialisedErr
  const errMsg = JSON.stringify(sanitisedErr)

  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get("env") === "development" ? err : {}

  // Error handling for custom errors
  if (err.isIsomerError) {
    logger.error(errMsg, { error: err })
    if (err.isV2Err) {
      return res.status(err.status).json({
        error: IsomerError.toExternalRepresentation(err),
      })
    }
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
    logger.error(errMsg, { error: err })
    return res.status(413).json({
      error: {
        name: err.name,
        code: 413,
        message: err.message,
      },
    })
  }
  logger.error(`Unrecognized internal server error: ${errMsg}`, { error: err })
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
