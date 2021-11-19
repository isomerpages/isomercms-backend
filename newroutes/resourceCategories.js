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
    const { accessToken } = req

    const { siteName, resourceRoomName, resourceCategory } = req.params
    const listResp = await this.resourceDirectoryService.listFiles(
      { siteName, accessToken },
      { resourceRoomName, resourceCategory }
    )
    return res.status(200).json(listResp)
  }

  // Create new resource category
  async createResourceDirectory(req, res) {
    const { accessToken } = req

    const { siteName, resourceRoomName } = req.params
    const { error } = CreateResourceDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { newDirectoryName } = req.body
    const createResp = await this.resourceDirectoryService.createResourceDirectory(
      { siteName, accessToken },
      {
        resourceRoomName,
        resourceCategory: newDirectoryName,
      }
    )

    return res.status(200).json(createResp)
  }

  // Rename resource category
  async renameResourceDirectory(req, res) {
    const { accessToken, currentCommitSha, treeSha } = req

    const { siteName, resourceRoomName, resourceCategory } = req.params
    const { error } = RenameResourceDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { newDirectoryName } = req.body
    await this.resourceDirectoryService.renameResourceDirectory(
      { siteName, accessToken, currentCommitSha, treeSha },
      {
        resourceRoomName,
        resourceCategory,
        newDirectoryName,
      }
    )

    return res.status(200).send("OK")
  }

  // Delete resource category
  async deleteResourceDirectory(req, res) {
    const { accessToken, currentCommitSha, treeSha } = req

    const { siteName, resourceRoomName, resourceCategory } = req.params
    await this.resourceDirectoryService.deleteResourceDirectory(
      { siteName, accessToken, currentCommitSha, treeSha },
      {
        resourceRoomName,
        resourceCategory,
      }
    )
    return res.status(200).send("OK")
  }

  // Move resource category
  async moveResourceDirectoryPages(req, res) {
    const { accessToken } = req

    const { siteName, resourceRoomName, resourceCategory } = req.params
    const { error } = MoveResourceDirectoryPagesRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      items,
      target: { resourceCategory: targetResourceCategory },
    } = req.body
    await this.resourceDirectoryService.moveResourcePages(
      { siteName, accessToken },
      {
        resourceRoomName,
        resourceCategory,
        targetResourceCategory,
        objArray: items,
      }
    )
    return res.status(200).send("OK")
  }

  getRouter() {
    const router = express.Router()

    router.get(
      "/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategory",
      attachReadRouteHandlerWrapper(this.listResourceDirectoryFiles)
    )
    router.post(
      "/:siteName/resourceRoom/:resourceRoomName/resources",
      attachRollbackRouteHandlerWrapper(this.createResourceDirectory)
    )
    router.post(
      "/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategory",
      attachRollbackRouteHandlerWrapper(this.renameResourceDirectory)
    )
    router.delete(
      "/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategory",
      attachRollbackRouteHandlerWrapper(this.deleteResourceDirectory)
    )
    router.post(
      "/:siteName/resourceRoom/:resourceRoomName/resources/:resourceCategory/move",
      attachRollbackRouteHandlerWrapper(this.moveResourceDirectoryPages)
    )

    return router
  }
}

module.exports = { ResourceCategoriesRouter }
