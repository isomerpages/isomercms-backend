const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const { UpdateNavigationRequestSchema } = require("@validators/RequestSchema")

const { authMiddleware } = require("@root/newmiddleware/index")

class NavigationRouter {
  constructor({ navigationYmlService }) {
    this.navigationYmlService = navigationYmlService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Read navigation file
  async readNavigation(req, res) {
    const {
      accessToken,
      params: { siteName },
    } = req

    const readResp = await this.navigationYmlService.read({
      siteName,
      accessToken,
    })

    return res.status(200).json(readResp)
  }

  // Update navigation index file
  async updateNavigation(req, res) {
    const { error } = UpdateNavigationRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)

    const {
      accessToken,
      params: { siteName },
      body: { content: fileContent, sha },
    } = req

    const updatedNavigationPage = await this.navigationYmlService.update(
      { siteName, accessToken },
      { fileContent, sha }
    )

    return res.status(200).json(updatedNavigationPage)
  }

  getRouter() {
    const router = express.Router()

    router.use(authMiddleware.verifyJwt)

    router.get(
      "/:siteName/navigation",
      attachReadRouteHandlerWrapper(this.readNavigation)
    )
    router.post(
      "/:siteName/navigation",
      attachWriteRouteHandlerWrapper(this.updateNavigation)
    )

    return router
  }
}

module.exports = { NavigationRouter }
