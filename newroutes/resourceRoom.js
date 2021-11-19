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
} = require("@validators/RequestSchema")

class ResourceRoomRouter {
  constructor({ resourceRoomDirectoryService }) {
    this.resourceRoomDirectoryService = resourceRoomDirectoryService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Get resource room name
  async getResourceRoomDirectory(req, res) {
    const { accessToken } = req

    const { siteName } = req.params
    const getResp = await this.resourceRoomDirectoryService.getResourceRoomDirectory(
      { siteName, accessToken }
    )

    return res.status(200).json(getResp)
  }

  // List all resource categories
  async listAllResourceCategories(req, res) {
    const { accessToken } = req

    const { siteName, resourceRoomName } = req.params
    const listResp = await this.resourceRoomDirectoryService.listAllResourceCategories(
      {
        siteName,
        accessToken,
      },
      {
        resourceRoomName,
      }
    )

    return res.status(200).json(listResp)
  }

  // Create new resource room
  async createResourceRoomDirectory(req, res) {
    const { accessToken } = req

    const { siteName } = req.params
    const { error } = CreateResourceDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { newDirectoryName } = req.body
    const createResp = await this.resourceRoomDirectoryService.createResourceRoomDirectory(
      { siteName, accessToken },
      {
        resourceRoomName: newDirectoryName,
      }
    )

    return res.status(200).json(createResp)
  }

  // Rename resource room
  async renameResourceRoomDirectory(req, res) {
    const { accessToken, currentCommitSha, treeSha } = req

    const { siteName, resourceRoomName } = req.params
    const { error } = RenameResourceDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { newDirectoryName } = req.body
    await this.resourceRoomDirectoryService.renameResourceRoomDirectory(
      { siteName, accessToken, currentCommitSha, treeSha },
      {
        resourceRoomName,
        newDirectoryName,
      }
    )

    return res.status(200).send("OK")
  }

  // Delete resource room
  async deleteResourceRoomDirectory(req, res) {
    const { accessToken, currentCommitSha, treeSha } = req

    const { siteName, resourceRoomName } = req.params
    await this.resourceRoomDirectoryService.deleteResourceRoomDirectory(
      { siteName, accessToken, currentCommitSha, treeSha },
      {
        resourceRoomName,
      }
    )
    return res.status(200).send("OK")
  }

  getRouter() {
    const router = express.Router()

    router.get(
      "/:siteName/resourceRoom",
      attachReadRouteHandlerWrapper(this.getResourceRoomDirectory)
    )
    router.post(
      "/:siteName/resourceRoom",
      attachRollbackRouteHandlerWrapper(this.createResourceRoomDirectory)
    )
    router.get(
      "/:siteName/resourceRoom/:resourceRoomName",
      attachRollbackRouteHandlerWrapper(this.listAllResourceCategories)
    )
    router.post(
      "/:siteName/resourceRoom/:resourceRoomName",
      attachRollbackRouteHandlerWrapper(this.renameResourceRoomDirectory)
    )
    router.delete(
      "/:siteName/resourceRoom/:resourceRoomName",
      attachRollbackRouteHandlerWrapper(this.deleteResourceRoomDirectory)
    )

    return router
  }
}

module.exports = { ResourceRoomRouter }
