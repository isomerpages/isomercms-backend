// Imports
const express = require("express")

// Logger
const logger = require("@logger/logger").default

const apiLogger = express.Router()

apiLogger.use((req, res, next) => {
  function isObjEmpty(obj) {
    return Object.keys(obj).length === 0
  }

  // Get IP address
  const ipAddress = req.headers["x-forwarded-for"]

  // Get user GitHub id
  const userEmail = res.locals.sessionData
    ? res.locals.sessionData.email
    : "(not logged in)"

  let logMessage = `User ${userEmail} from IP address ${
    ipAddress ? `(IP: ${ipAddress})` : undefined
  } called ${req.method} on ${req.path}`
  if (!isObjEmpty(req.query)) {
    logMessage += ` with query ${JSON.stringify(req.query)}`
  }
  logger.info(logMessage)
  return next()
})

module.exports = { apiLogger }
