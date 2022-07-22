const cookieParser = require("cookie-parser")
const express = require("express")

const { errorHandler } = require("@middleware/errorHandler")

const { mockSessionData } = require("./sessionData")

const attachSessionData = (req, res, next) => {
  res.locals.sessionData = mockSessionData
  next()
}

function generateRouter(router) {
  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))
  app.use(cookieParser())
  app.use(attachSessionData)
  app.use(router)
  app.use(errorHandler)
  return app
}

module.exports = {
  generateRouter,
}
