const autoBind = require("auto-bind")
const express = require("express")

// Import custom error types
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const { UpdateHomepageSchema } = require("@validators/RequestSchema")

class HomepageRouter {
  constructor({ homepagePageService }) {
    this.homepagePageService = homepagePageService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Read homepage index file
  async readHomepage(req, res) {
    const { accessToken } = res.locals

    const { siteName } = req.params

    const readResp = await this.homepagePageService.read({
      siteName,
      accessToken,
    })

    return res.status(200).json(readResp)
  }

  // Update homepage index file
  async updateHomepage(req, res) {
    const { accessToken } = res.locals

    const { siteName } = req.params
    const { error } = UpdateHomepageSchema.validate(req.body, {
      allowUnknown: true,
    })
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter, pageBody },
      sha,
    } = req.body

    const updatedHomepage = await this.homepagePageService.update(
      { siteName, accessToken },
      { content: pageBody, frontMatter, sha }
    )

    return res.status(200).json(updatedHomepage)
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get("/", attachReadRouteHandlerWrapper(this.readHomepage))
    router.post("/", attachWriteRouteHandlerWrapper(this.updateHomepage))

    return router
  }
}

module.exports = { HomepageRouter }
