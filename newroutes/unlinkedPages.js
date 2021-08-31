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
  constructor({ unlinkedPageService, unlinkedPagesDirectoryService }) {
    this.unlinkedPageService = unlinkedPageService
    this.unlinkedPagesDirectoryService = unlinkedPagesDirectoryService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  async listAllUnlinkedPages(req, res) {
    const { accessToken } = req

    const { siteName } = req.params
    const listResp = await this.unlinkedPagesDirectoryService.listAllUnlinkedPages(
      { siteName, accessToken }
    )

    return res.status(200).json(listResp)
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
    const createResp = await this.unlinkedPageService.create(
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
    const { sha, content } = await this.unlinkedPageService.read(
      { siteName, accessToken },
      { fileName: pageName }
    )

    return res.status(200).json({ pageName, sha, content })
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

    let updateResp
    if (newFileName) {
      updateResp = await this.unlinkedPageService.rename(
        { siteName, accessToken },
        {
          oldFileName: pageName,
          newFileName,
          content: pageBody,
          frontMatter,
          sha,
        }
      )
    } else {
      updateResp = await this.unlinkedPageService.update(
        { siteName, accessToken },
        {
          fileName: pageName,
          content: pageBody,
          frontMatter,
          sha,
        }
      )
    }

    return res.status(200).json(updateResp)
  }

  async deleteUnlinkedPage(req, res) {
    const { accessToken } = req

    const { siteName, pageName } = req.params
    const { error } = DeletePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error)
    const { sha } = req.body
    await this.unlinkedPageService.delete(
      { siteName, accessToken },
      {
        fileName: pageName,
        sha,
      }
    )

    return res.status(200).send("OK")
  }

  async moveUnlinkedPages(req, res) {
    const { accessToken } = req

    const { siteName } = req.params
    const { error } = MoveDirectoryPagesRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      items,
      target: {
        collectionName: targetCollectionName,
        subCollectionName: targetSubcollectionName,
      },
    } = req.body
    await this.unlinkedPagesDirectoryService.movePages(
      { siteName, accessToken },
      {
        targetCollectionName,
        targetSubcollectionName,
        objArray: items,
      }
    )
    return res.status(200).send("OK")
  }

  getRouter() {
    const router = express.Router()

    router.get(
      "/:siteName/pages",
      attachReadRouteHandlerWrapper(this.listAllUnlinkedPages)
    )
    router.post(
      "/:siteName/pages/pages",
      attachRollbackRouteHandlerWrapper(this.createUnlinkedPage)
    )
    router.get(
      "/:siteName/pages/pages/:pageName",
      attachReadRouteHandlerWrapper(this.readUnlinkedPage)
    )
    router.post(
      "/:siteName/pages/pages/:pageName",
      attachWriteRouteHandlerWrapper(this.updateUnlinkedPage)
    )
    router.delete(
      "/:siteName/pages/pages/:pageName",
      attachRollbackRouteHandlerWrapper(this.deleteUnlinkedPage)
    )
    router.post(
      "/:siteName/pages/move",
      attachRollbackRouteHandlerWrapper(this.moveUnlinkedPages)
    )

    return router
  }
}

module.exports = { UnlinkedPagesRouter }
