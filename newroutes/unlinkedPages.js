const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const {
  CreatePageRequestSchema,
  UpdatePageRequestSchema,
  DeletePageRequestSchema,
} = require("@validators/RequestSchema")

class UnlinkedPagesRouter {
  constructor({ unlinkedPageController }) {
    this.unlinkedPageController = unlinkedPageController
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  async createUnlinkedPage(req, res) {
    const { accessToken } = req

    const { siteName } = req.params
    const { error } = CreatePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter, pageBody },
      newFileName,
    } = req.body
    const createResp = await this.unlinkedPageController.createPage(
      { siteName, accessToken },
      {
        fileName: newFileName,
        content: pageBody,
        frontMatter,
      }
    )

    return res.status(200).json(createResp)
  }

  async readUnlinkedPage(req, res) {
    const { accessToken } = req

    const { siteName, pageName } = req.params
    const { sha, content } = await this.unlinkedPageController.readPage(
      { siteName, accessToken },
      { fileName: pageName }
    )

    return res.status(200).json({ collectionName, pageName, sha, content })
  }

  async updateUnlinkedPage(req, res) {
    const { accessToken } = req

    const { siteName, pageName } = req.params
    const { error } = UpdatePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error)
    const {
      content: { frontMatter, pageBody },
      sha,
      newFileName,
    } = req.body
    const updateResp = await this.unlinkedPageController.updatePage(
      { siteName, accessToken },
      {
        fileName: pageName,
        newFileName,
        content: pageBody,
        frontMatter,
        sha,
      }
    )

    return res.status(200).json(updateResp)
  }

  async deleteUnlinkedPage(req, res) {
    const { accessToken } = req

    const { siteName, pageName } = req.params
    const { error } = DeletePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error)
    const { sha } = req.body
    await this.unlinkedPageController.deletePage(
      { siteName, accessToken },
      {
        fileName: pageName,
        sha,
      }
    )

    return res.status(200).send("OK")
  }

  getRouter() {
    const router = express.Router()

    router.post(
      "/:siteName/pages",
      attachRollbackRouteHandlerWrapper(this.createUnlinkedPage)
    )
    router.get(
      "/:siteName/pages/:pageName",
      attachReadRouteHandlerWrapper(this.readUnlinkedPage)
    )
    router.post(
      "/:siteName/pages/:pageName",
      attachWriteRouteHandlerWrapper(this.updateUnlinkedPage)
    )
    router.delete(
      "/:siteName/pages/:pageName",
      attachRollbackRouteHandlerWrapper(this.deleteUnlinkedPage)
    )

    return router
  }
}

module.exports = { UnlinkedPagesRouter }
