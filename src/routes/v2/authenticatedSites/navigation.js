const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const { UpdateNavigationRequestSchema } = require("@validators/RequestSchema")

class NavigationRouter {
  constructor({ navigationYmlService }) {
    this.navigationYmlService = navigationYmlService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Read navigation file
  async readNavigation(req, res) {
    const { sessionData } = res.locals

    const readResp = await this.navigationYmlService.read(sessionData)

    return res.status(200).json(readResp)
  }

  // Update navigation index file
  async updateNavigation(req, res) {
    const { error } = UpdateNavigationRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)

    const {
      body: { content: fileContent, sha },
    } = req
    const { sessionData } = res.locals

    const updatedNavigationPage = await this.navigationYmlService.update(
      sessionData,
      { fileContent, sha }
    )

    return res.status(200).json(updatedNavigationPage)
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get("/", attachReadRouteHandlerWrapper(this.readNavigation))
    router.post("/", attachWriteRouteHandlerWrapper(this.updateNavigation))

    return router
  }
}

module.exports = { NavigationRouter }
