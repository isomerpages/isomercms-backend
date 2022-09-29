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

class ResourcePagesRouter {
  constructor({ resourcePageService }) {
    this.resourcePageService = resourcePageService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Create new page in resource category
  async createResourcePage(req, res) {
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
        fileName: newFileName,
        resourceRoomName,
        resourceCategoryName,
        content: pageBody,
        frontMatter,
      }
    )

    return res.status(200).json(createResp)
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
  async updateResourcePage(req, res) {
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
          newFileName,
          resourceRoomName,
          resourceCategoryName,
          content: pageBody,
          frontMatter,
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
    return res.status(200).json(updateResp)
  }

  // Delete page in resource category
  async deleteResourcePage(req, res) {
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

    return res.status(200).send("OK")
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
