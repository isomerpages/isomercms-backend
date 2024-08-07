const autoBind = require("auto-bind")
const express = require("express")

// Import custom error types
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const { recursiveTrimAndReplaceLineBreaks } = require("@utils/yaml-utils")

const { UpdateHomepageSchema } = require("@validators/RequestSchema")

class HomepageRouter {
  constructor({ homepagePageService }) {
    this.homepagePageService = homepagePageService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Read homepage index file
  async readHomepage(req, res) {
    const { userWithSiteSessionData } = res.locals

    const readResp = await this.homepagePageService.read(
      userWithSiteSessionData
    )

    return res.status(200).json(readResp)
  }

  // Update homepage index file
  async updateHomepage(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { error } = UpdateHomepageSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter, pageBody },
      sha,
    } = req.body

    const updatedHomepage = await this.homepagePageService.update(
      userWithSiteSessionData,
      {
        content: pageBody,
        frontMatter: recursiveTrimAndReplaceLineBreaks(frontMatter),
        sha,
      }
    )

    res.status(200).json(updatedHomepage)
    return next()
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get("/", attachReadRouteHandlerWrapper(this.readHomepage))
    router.post("/", attachRollbackRouteHandlerWrapper(this.updateHomepage))

    return router
  }
}

module.exports = { HomepageRouter }
