const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const {
  CreatePageRequestSchema,
  UpdatePageRequestSchema,
  DeletePageRequestSchema,
  MoveDirectoryPagesRequestSchema,
} = require("@validators/RequestSchema")

const { recursiveTrimAndReplaceLineBreaks } = require("@root/utils/yaml-utils")

class UnlinkedPagesRouter {
  constructor({ unlinkedPageService, unlinkedPagesDirectoryService }) {
    this.unlinkedPageService = unlinkedPageService
    this.unlinkedPagesDirectoryService = unlinkedPagesDirectoryService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  async listAllUnlinkedPages(req, res) {
    const { userWithSiteSessionData } = res.locals

    const listResp = await this.unlinkedPagesDirectoryService.listAllUnlinkedPages(
      userWithSiteSessionData
    )

    return res.status(200).json(listResp)
  }

  async createUnlinkedPage(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { error } = CreatePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter, pageBody },
      newFileName,
    } = req.body
    const createResp = await this.unlinkedPageService.create(
      userWithSiteSessionData,
      {
        fileName: recursiveTrimAndReplaceLineBreaks(newFileName),
        content: pageBody,
        frontMatter: recursiveTrimAndReplaceLineBreaks(frontMatter),
      }
    )

    res.status(200).json(createResp)
    return next()
  }

  async readUnlinkedPage(req, res) {
    const { userWithSiteSessionData } = res.locals

    const { pageName } = req.params
    const { sha, content } = await this.unlinkedPageService.read(
      userWithSiteSessionData,
      {
        fileName: pageName,
      }
    )

    return res.status(200).json({ pageName, sha, content })
  }

  async updateUnlinkedPage(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { pageName } = req.params
    const { error } = UpdatePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter, pageBody },
      sha,
      newFileName,
    } = req.body

    let updateResp
    if (newFileName) {
      updateResp = await this.unlinkedPageService.rename(
        userWithSiteSessionData,
        {
          oldFileName: pageName,
          newFileName: recursiveTrimAndReplaceLineBreaks(newFileName),
          content: pageBody,
          frontMatter: recursiveTrimAndReplaceLineBreaks(frontMatter),
          sha,
        }
      )
    } else {
      updateResp = await this.unlinkedPageService.update(
        userWithSiteSessionData,
        {
          fileName: pageName,
          content: pageBody,
          frontMatter: recursiveTrimAndReplaceLineBreaks(frontMatter),
          sha,
        }
      )
    }

    res.status(200).json(updateResp)
    return next()
  }

  async deleteUnlinkedPage(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { pageName } = req.params
    const { error } = DeletePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { sha } = req.body
    await this.unlinkedPageService.delete(userWithSiteSessionData, {
      fileName: pageName,
      sha,
    })

    res.status(200).send("OK")
    return next()
  }

  async moveUnlinkedPages(req, res, next) {
    const { userWithSiteSessionData } = res.locals

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
      userWithSiteSessionData,
      {
        targetCollectionName,
        targetSubcollectionName,
        objArray: items,
      }
    )
    res.status(200).send("OK")
    return next()
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get("/", attachReadRouteHandlerWrapper(this.listAllUnlinkedPages))
    router.post(
      "/pages",
      attachRollbackRouteHandlerWrapper(this.createUnlinkedPage)
    )
    router.get(
      "/pages/:pageName",
      attachReadRouteHandlerWrapper(this.readUnlinkedPage)
    )
    router.post(
      "/pages/:pageName",
      attachRollbackRouteHandlerWrapper(this.updateUnlinkedPage)
    )
    router.delete(
      "/pages/:pageName",
      attachRollbackRouteHandlerWrapper(this.deleteUnlinkedPage)
    )
    router.post(
      "/move",
      attachRollbackRouteHandlerWrapper(this.moveUnlinkedPages)
    )

    return router
  }
}

module.exports = { UnlinkedPagesRouter }
