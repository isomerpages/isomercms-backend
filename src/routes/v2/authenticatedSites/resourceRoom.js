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
    const { userWithSiteSessionData } = res.locals

    const getResp = await this.resourceRoomDirectoryService.getResourceRoomDirectoryName(
      userWithSiteSessionData
    )

    return res.status(200).json(getResp)
  }

  // List all resource categories
  async listAllResourceCategories(req, res) {
    const { userWithSiteSessionData } = res.locals

    const { resourceRoomName } = req.params
    const listResp = await this.resourceRoomDirectoryService.listAllResourceCategories(
      userWithSiteSessionData,
      {
        resourceRoomName,
      }
    )

    return res.status(200).json(listResp)
  }

  // Create new resource room
  async createResourceRoomDirectory(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { error } = CreateResourceDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { newDirectoryName } = req.body
    const createResp = await this.resourceRoomDirectoryService.createResourceRoomDirectory(
      userWithSiteSessionData,
      {
        resourceRoomName: newDirectoryName,
      }
    )

    res.status(200).json(createResp)
    return next()
  }

  // Rename resource room
  async renameResourceRoomDirectory(req, res, next) {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { resourceRoomName } = req.params
    const { error } = RenameResourceDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { newDirectoryName } = req.body
    await this.resourceRoomDirectoryService.renameResourceRoomDirectory(
      userWithSiteSessionData,
      githubSessionData,
      {
        resourceRoomName,
        newDirectoryName,
      }
    )

    res.status(200).send("OK")
    return next()
  }

  // Delete resource room
  async deleteResourceRoomDirectory(req, res) {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { resourceRoomName } = req.params
    await this.resourceRoomDirectoryService.deleteResourceRoomDirectory(
      userWithSiteSessionData,
      githubSessionData,
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
