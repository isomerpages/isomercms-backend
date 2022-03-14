const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const { UpdateContactUsSchema } = require("@validators/RequestSchema")

const { authMiddleware } = require("@root/newmiddleware/index")

class ContactUsRouter {
  constructor({ contactUsPageService }) {
    this.contactUsPageService = contactUsPageService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Read contactUs file
  async readContactUs(req, res) {
    const {
      accessToken,
      params: { siteName },
    } = req

    const readResp = await this.contactUsPageService.read({
      siteName,
      accessToken,
    })

    return res.status(200).json(readResp)
  }

  // Update contactUs index file
  async updateContactUs(req, res) {
    const { accessToken } = req

    const { siteName } = req.params
    const { error } = UpdateContactUsSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter, pageBody },
      sha,
    } = req.body

    const updateResp = await this.contactUsPageService.update(
      { siteName, accessToken },
      { content: pageBody, frontMatter, sha }
    )

    return res.status(200).json(updateResp)
  }

  getRouter() {
    const router = express.Router()

    router.use(authMiddleware.verifyJwt)

    router.get(
      "/:siteName/contactUs",
      attachReadRouteHandlerWrapper(this.readContactUs)
    )
    router.post(
      "/:siteName/contactUs",
      attachWriteRouteHandlerWrapper(this.updateContactUs)
    )

    return router
  }
}

module.exports = { ContactUsRouter }
