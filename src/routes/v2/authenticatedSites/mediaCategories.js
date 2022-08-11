const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const {
  CreateMediaDirectoryRequestSchema,
  RenameMediaDirectoryRequestSchema,
  MoveMediaDirectoryFilesRequestSchema,
} = require("@validators/RequestSchema")

class MediaCategoriesRouter {
  constructor({ mediaDirectoryService }) {
    this.mediaDirectoryService = mediaDirectoryService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // List files in a resource category
  async listMediaDirectoryFiles(req, res) {
    const { userWithSiteSessionData } = res.locals

    const { directoryName } = req.params
    const listResp = await this.mediaDirectoryService.listFiles(
      userWithSiteSessionData,
      {
        directoryName,
      }
    )
    return res.status(200).json(listResp)
  }

  // Create new media directory
  async createMediaDirectory(req, res) {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { error } = CreateMediaDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { newDirectoryName, items } = req.body
    const createResp = await this.mediaDirectoryService.createMediaDirectory(
      userWithSiteSessionData,
      githubSessionData,
      {
        directoryName: newDirectoryName,
        objArray: items,
      }
    )

    return res.status(200).json(createResp)
  }

  // Rename resource category
  async renameMediaDirectory(req, res) {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { directoryName } = req.params
    const { error } = RenameMediaDirectoryRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { newDirectoryName } = req.body
    await this.mediaDirectoryService.renameMediaDirectory(
      userWithSiteSessionData,
      githubSessionData,
      {
        directoryName,
        newDirectoryName,
      }
    )

    return res.status(200).send("OK")
  }

  // Delete resource category
  async deleteMediaDirectory(req, res) {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { directoryName } = req.params
    await this.mediaDirectoryService.deleteMediaDirectory(
      userWithSiteSessionData,
      githubSessionData,
      {
        directoryName,
      }
    )
    return res.status(200).send("OK")
  }

  // Move resource category
  async moveMediaFiles(req, res) {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { directoryName } = req.params
    const { error } = MoveMediaDirectoryFilesRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      items,
      target: { directoryName: targetDirectoryName },
    } = req.body
    await this.mediaDirectoryService.moveMediaFiles(
      userWithSiteSessionData,
      githubSessionData,
      {
        directoryName,
        targetDirectoryName,
        objArray: items,
      }
    )
    return res.status(200).send("OK")
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get(
      "/:directoryName",
      attachReadRouteHandlerWrapper(this.listMediaDirectoryFiles)
    )
    router.post(
      "/",
      attachRollbackRouteHandlerWrapper(this.createMediaDirectory)
    )
    router.post(
      "/:directoryName",
      attachRollbackRouteHandlerWrapper(this.renameMediaDirectory)
    )
    router.delete(
      "/:directoryName",
      attachRollbackRouteHandlerWrapper(this.deleteMediaDirectory)
    )
    router.post(
      "/:directoryName/move",
      attachRollbackRouteHandlerWrapper(this.moveMediaFiles)
    )

    return router
  }
}

module.exports = { MediaCategoriesRouter }
