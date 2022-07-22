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
  async getResourceRoomDirectoryName(req, res) {
    const { sessionData } = res.locals

    const getResp = await this.resourceRoomDirectoryService.getResourceRoomDirectoryName(
      sessionData
    )

    return res.status(200).json(getResp)
  }

  // List all resource categories
  async listAllResourceCategories(req, res) {
    const { sessionData } = res.locals

    const { resourceRoomName } = req.params
    const listResp = await this.resourceRoomDirectoryService.listAllResourceCategories(
      sessionData,
      {
        resourceRoomName,
      }
    )

    return res.status(200).json(listResp)
  }

  // Create new resource room
  async createResourceRoomDirectory(req, res) {
    const { sessionData } = res.locals

    const { error } = CreateResourceDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { newDirectoryName } = req.body
    const createResp = await this.resourceRoomDirectoryService.createResourceRoomDirectory(
      sessionData,
      {
        resourceRoomName: newDirectoryName,
      }
    )

    return res.status(200).json(createResp)
  }

  // Rename resource room
  async renameResourceRoomDirectory(req, res) {
    const { sessionData } = res.locals

    const { resourceRoomName } = req.params
    const { error } = RenameResourceDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { newDirectoryName } = req.body
    await this.resourceRoomDirectoryService.renameResourceRoomDirectory(
      sessionData,
      {
        resourceRoomName,
        newDirectoryName,
      }
    )

    return res.status(200).send("OK")
  }

  // Delete resource room
  async deleteResourceRoomDirectory(req, res) {
    const { sessionData } = res.locals

    const { resourceRoomName } = req.params
    await this.resourceRoomDirectoryService.deleteResourceRoomDirectory(
      sessionData,
      {
        resourceRoomName,
      }
    )
    return res.status(200).send("OK")
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get(
      "/",
      attachReadRouteHandlerWrapper(this.getResourceRoomDirectoryName)
    )
    router.post(
      "/",
      attachRollbackRouteHandlerWrapper(this.createResourceRoomDirectory)
    )
    router.get(
      "/:resourceRoomName",
      attachReadRouteHandlerWrapper(this.listAllResourceCategories)
    )
    router.post(
      "/:resourceRoomName",
      attachRollbackRouteHandlerWrapper(this.renameResourceRoomDirectory)
    )
    router.delete(
      "/:resourceRoomName",
      attachRollbackRouteHandlerWrapper(this.deleteResourceRoomDirectory)
    )

    return router
  }
}

module.exports = { ResourceRoomRouter }
