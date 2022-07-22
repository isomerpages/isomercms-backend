const autoBind = require("auto-bind")
const express = require("express")

const { attachReadRouteHandlerWrapper } = require("@middleware/routeHandler")

class NetlifyTomlRouter {
  constructor({ netlifyTomlService }) {
    this.netlifyTomlService = netlifyTomlService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Read netlify.toml file
  async readNetlifyToml(req, res) {
    const { sessionData } = res.locals

    const netlifyTomlHeaderValues = await this.netlifyTomlService.read(
      sessionData
    )

    return res.status(200).json({ netlifyTomlHeaderValues })
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get("/", attachReadRouteHandlerWrapper(this.readNetlifyToml))

    return router
  }
}

module.exports = { NetlifyTomlRouter }
