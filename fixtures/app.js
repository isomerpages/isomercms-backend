const express = require("express")

const { errorHandler } = require("@middleware/errorHandler")

function generateRouter(router) {
  const app = express()
  app.use(express.json({ limit: "7mb" }))
  app.use(express.urlencoded({ extended: false }))
  app.use(router)
  app.use(errorHandler)
  return app
}

module.exports = {
  generateRouter,
}
