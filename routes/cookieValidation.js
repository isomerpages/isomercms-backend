// Imports
const express = require('express')

// Attach route handler wrapper
const { attachRouteHandlerWrapper } = require('../middleware/routeHandler')

// Setup services
const router = express.Router()

async function cookieValidation (req, res) {
  res.sendStatus(200)
}

router.get('/', attachRouteHandlerWrapper(cookieValidation))

module.exports = router
