const cookieParser = require("cookie-parser")
const express = require("express")

const { errorHandler } = require("@middleware/errorHandler")

const {
  mockUserSessionData,
  mockUserWithSiteSessionData,
  mockGithubSessionData,
} = require("./sessionData")

const attachSessionData = (req, res, next) => {
  res.locals.userSessionData = mockUserSessionData
  res.locals.userWithSiteSessionData = mockUserWithSiteSessionData
  res.locals.githubSessionData = mockGithubSessionData
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
