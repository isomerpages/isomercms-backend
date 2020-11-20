// Imports
const express = require('express')

// Logger
const logger = require('../logger/logger')

const apiLogger = express.Router()

apiLogger.use((req, res, next) => {
    function isObjEmpty (obj) {
        return Object.keys(obj).length === 0
    }

    // Get IP address
    const ipAddress = req.headers['x-forwarded-for']

    // Get user GitHub id
    let userId
    if (req.userId) userId = req.userId

    let logMessage = `User ${userId} from IP address ${ipAddress ? `(IP: ${ipAddress})` : undefined } called ${req.method} on ${req.path}`
    if (!isObjEmpty(req.query)) {
        logMessage += ` with query ${JSON.stringify(req.query)}`
    }
    logger.info(logMessage)
    return next()
})

module.exports = { apiLogger }
