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

  // List content in a resource category.
  // This includes both files and subdirectories within the resource category.
  async listMediaDirectoryContents(req, res) {
    const { userWithSiteSessionData } = res.locals

    const { directoryName } = req.params
    const { page, limit } = req.query
    const {
      directories,
      files,
    } = await this.mediaDirectoryService.listMediaDirectoryContent(
      userWithSiteSessionData,
      {
        directoryName,
        page,
        limit,
      }
    )
    return res.status(200).json([...directories, ...files])
  }

  // List files within a resource category.
  async listMediaDirectoryFiles(req, res) {
    const { userWithSiteSessionData } = res.locals

    const { directoryName } = req.params
    const { page, limit, search } = req.query

    const {
      files,
      total,
    } = await this.mediaDirectoryService.listMediaDirectoryContent(
      userWithSiteSessionData,
      {
        directoryName,
        page,
        limit,
        search,
      }
    )
    return res.status(200).json({ files, total })
  }

  async listMediaDirectorySubdirectories(req, res) {
    const { userWithSiteSessionData } = res.locals

    const { directoryName } = req.params
    const { page } = req.query

    const {
      directories,
    } = await this.mediaDirectoryService.listMediaDirectoryContent(
      userWithSiteSessionData,
      {
        directoryName,
        page,
      }
    )
    return res.status(200).json({ directories })
  }

  // Create new media directory
  async createMediaDirectory(req, res, next) {
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

    res.status(200).json(createResp)
    return next()
  }

  // Rename resource category
  async renameMediaDirectory(req, res, next) {
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

    res.status(200).send("OK")
    return next()
  }

  // Delete resource category
  async deleteMediaDirectory(req, res, next) {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { directoryName } = req.params
    await this.mediaDirectoryService.deleteMediaDirectory(
      userWithSiteSessionData,
      githubSessionData,
      {
        directoryName,
      }
    )
    res.status(200).send("OK")
    return next()
  }

  // Move resource category
  async moveMediaFiles(req, res, next) {
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
    res.status(200).send("OK")
    return next()
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get(
      "/:directoryName",
      attachReadRouteHandlerWrapper(this.listMediaDirectoryContents)
    )
    router.get(
      "/:directoryName/files",
      attachReadRouteHandlerWrapper(this.listMediaDirectoryFiles)
    )
    router.get(
      "/:directoryName/subdirectories",
      attachReadRouteHandlerWrapper(this.listMediaDirectorySubdirectories)
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
