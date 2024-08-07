const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const { recursiveTrimAndReplaceLineBreaks } = require("@utils/yaml-utils")

const { UpdateContactUsSchema } = require("@validators/RequestSchema")

class ContactUsRouter {
  constructor({ contactUsPageService }) {
    this.contactUsPageService = contactUsPageService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Read contactUs file
  async readContactUs(req, res) {
    const { userWithSiteSessionData } = res.locals

    const readResp = await this.contactUsPageService.read(
      userWithSiteSessionData
    )

    return res.status(200).json(readResp)
  }

  // Update contactUs index file
  async updateContactUs(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { error } = UpdateContactUsSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter, pageBody },
      sha,
    } = req.body

    const updatedContactUsPage = await this.contactUsPageService.update(
      userWithSiteSessionData,
      {
        content: pageBody,
        frontMatter: recursiveTrimAndReplaceLineBreaks(frontMatter),
        sha,
      }
    )

    res.status(200).json(updatedContactUsPage)
    return next()
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get("/", attachReadRouteHandlerWrapper(this.readContactUs))
    router.post("/", attachRollbackRouteHandlerWrapper(this.updateContactUs))

    return router
  }
}

module.exports = { ContactUsRouter }
