const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const {
  CreateResourcePageRequestSchema,
  UpdateResourcePageRequestSchema,
  DeleteResourcePageRequestSchema,
} = require("@validators/RequestSchema")

const { recursiveTrimAndReplaceLineBreaks } = require("@root/utils/yaml-utils")

class ResourcePagesRouter {
  constructor({ resourcePageService }) {
    this.resourcePageService = resourcePageService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Create new page in resource category
  async createResourcePage(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { resourceRoomName, resourceCategoryName } = req.params
    const { error } = CreateResourcePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter, pageBody },
      newFileName,
    } = req.body
    const createResp = await this.resourcePageService.create(
      userWithSiteSessionData,
      {
        fileName: recursiveTrimAndReplaceLineBreaks(newFileName),
        resourceRoomName,
        resourceCategoryName,
        content: pageBody,
        frontMatter: recursiveTrimAndReplaceLineBreaks(frontMatter),
      }
    )

    res.status(200).json(createResp)
    return next()
  }

  // Read page in resource category
  async readResourcePage(req, res) {
    const { userWithSiteSessionData } = res.locals

    const { resourceRoomName, resourceCategoryName, pageName } = req.params

    const readResp = await this.resourcePageService.read(
      userWithSiteSessionData,
      {
        fileName: pageName,
        resourceRoomName,
        resourceCategoryName,
      }
    )

    return res.status(200).json(readResp)
  }

  // Update page in resource category
  async updateResourcePage(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { resourceRoomName, resourceCategoryName, pageName } = req.params
    const { error } = UpdateResourcePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter, pageBody },
      sha,
      newFileName,
    } = req.body
    let updateResp
    if (newFileName) {
      updateResp = await this.resourcePageService.rename(
        userWithSiteSessionData,
        {
          oldFileName: pageName,
          newFileName: recursiveTrimAndReplaceLineBreaks(newFileName),
          resourceRoomName,
          resourceCategoryName,
          content: pageBody,
          frontMatter: recursiveTrimAndReplaceLineBreaks(frontMatter),
          sha,
        }
      )
    } else {
      updateResp = await this.resourcePageService.update(
        userWithSiteSessionData,
        {
          fileName: pageName,
          resourceRoomName,
          resourceCategoryName,
          content: pageBody,
          frontMatter,
          sha,
        }
      )
    }
    res.status(200).json(updateResp)
    return next()
  }

  // Delete page in resource category
  async deleteResourcePage(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { resourceRoomName, resourceCategoryName, pageName } = req.params
    const { error } = DeleteResourcePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { sha } = req.body
    await this.resourcePageService.delete(userWithSiteSessionData, {
      fileName: pageName,
      resourceRoomName,
      resourceCategoryName,
      sha,
    })

    res.status(200).send("OK")
    return next()
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.post("/", attachRollbackRouteHandlerWrapper(this.createResourcePage))
    router.get(
      "/:pageName",
      attachReadRouteHandlerWrapper(this.readResourcePage)
    )
    router.post(
      "/:pageName",
      attachRollbackRouteHandlerWrapper(this.updateResourcePage)
    )
    router.delete(
      "/:pageName",
      attachRollbackRouteHandlerWrapper(this.deleteResourcePage)
    )

    return router
  }
}

module.exports = { ResourcePagesRouter }
