const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const {
  CreateResourceDirectoryRequestSchema,
  RenameResourceDirectoryRequestSchema,
  MoveResourceDirectoryPagesRequestSchema,
} = require("@validators/RequestSchema")

class ResourceCategoriesRouter {
  constructor({ resourceDirectoryService }) {
    this.resourceDirectoryService = resourceDirectoryService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // List files in a resource category
  async listResourceDirectoryFiles(req, res) {
    const { userWithSiteSessionData } = res.locals

    const { resourceRoomName, resourceCategoryName } = req.params
    const listResp = await this.resourceDirectoryService.listFiles(
      userWithSiteSessionData,
      { resourceRoomName, resourceCategoryName }
    )
    return res.status(200).json(listResp)
  }

  // Create new resource category
  async createResourceDirectory(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { resourceRoomName } = req.params
    const { error } = CreateResourceDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { newDirectoryName } = req.body
    const createResp = await this.resourceDirectoryService.createResourceDirectory(
      userWithSiteSessionData,
      {
        resourceRoomName,
        resourceCategoryName: newDirectoryName,
      }
    )

    res.status(200).json(createResp)
    return next()
  }

  // Rename resource category
  async renameResourceDirectory(req, res, next) {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { resourceRoomName, resourceCategoryName } = req.params
    const { error } = RenameResourceDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { newDirectoryName } = req.body
    await this.resourceDirectoryService.renameResourceDirectory(
      userWithSiteSessionData,
      githubSessionData,
      {
        resourceRoomName,
        resourceCategoryName,
        newDirectoryName,
      }
    )

    res.status(200).send("OK")
    return next()
  }

  // Delete resource category
  async deleteResourceDirectory(req, res, next) {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { resourceRoomName, resourceCategoryName } = req.params
    await this.resourceDirectoryService.deleteResourceDirectory(
      userWithSiteSessionData,
      githubSessionData,
      {
        resourceRoomName,
        resourceCategoryName,
      }
    )
    res.status(200).send("OK")
    return next()
  }

  // Move resource category
  async moveResourceDirectoryPages(req, res, next) {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { resourceRoomName, resourceCategoryName } = req.params
    const { error } = MoveResourceDirectoryPagesRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      items,
      target: { resourceCategoryName: targetResourceCategory },
    } = req.body
    await this.resourceDirectoryService.moveResourcePages(
      userWithSiteSessionData,
      githubSessionData,
      {
        resourceRoomName,
        resourceCategoryName,
        targetResourceCategory,
        objArray: items,
      }
    )
    res.status(200).send("OK")
    return next()
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get(
      "/:resourceCategoryName",
      attachReadRouteHandlerWrapper(this.listResourceDirectoryFiles)
    )
    router.post(
      "/",
      attachRollbackRouteHandlerWrapper(this.createResourceDirectory)
    )
    router.post(
      "/:resourceCategoryName",
      attachRollbackRouteHandlerWrapper(this.renameResourceDirectory)
    )
    router.delete(
      "/:resourceCategoryName",
      attachRollbackRouteHandlerWrapper(this.deleteResourceDirectory)
    )
    router.post(
      "/:resourceCategoryName/move",
      attachRollbackRouteHandlerWrapper(this.moveResourceDirectoryPages)
    )

    return router
  }
}

module.exports = { ResourceCategoriesRouter }
