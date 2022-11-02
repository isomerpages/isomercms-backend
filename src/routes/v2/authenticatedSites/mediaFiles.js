const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const {
  CreateMediaFileRequestSchema,
  UpdateMediaFileRequestSchema,
  DeleteMediaFileRequestSchema,
} = require("@validators/RequestSchema")

class MediaFilesRouter {
  constructor({ mediaFileService }) {
    this.mediaFileService = mediaFileService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Create new page in collection
  async createMediaFile(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { directoryName } = req.params
    const { error } = CreateMediaFileRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { content, newFileName } = req.body
    const createResp = await this.mediaFileService.create(
      userWithSiteSessionData,
      {
        fileName: newFileName,
        directoryName,
        content,
      }
    )

    res.status(200).json(createResp)
    return next()
  }

  // Read page in collection
  async readMediaFile(req, res) {
    const { userWithSiteSessionData } = res.locals

    const { fileName, directoryName } = req.params

    const readResp = await this.mediaFileService.read(userWithSiteSessionData, {
      fileName,
      directoryName,
    })
    return res.status(200).json(readResp)
  }

  // Update page in collection
  async updateMediaFile(req, res, next) {
    const { userWithSiteSessionData, githubSessionData } = res.locals

    const { fileName, directoryName } = req.params
    const { error } = UpdateMediaFileRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { content, sha, newFileName } = req.body
    let updateResp
    if (newFileName) {
      updateResp = await this.mediaFileService.rename(
        userWithSiteSessionData,
        githubSessionData,
        {
          oldFileName: fileName,
          newFileName,
          directoryName,
          content,
          sha,
        }
      )
    } else {
      updateResp = await this.mediaFileService.update(userWithSiteSessionData, {
        fileName,
        directoryName,
        content,
        sha,
      })
    }
    res.status(200).json(updateResp)
    return next()
  }

  // Delete page in collection
  async deleteMediaFile(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { fileName, directoryName } = req.params
    const { error } = DeleteMediaFileRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { sha } = req.body
    await this.mediaFileService.delete(userWithSiteSessionData, {
      fileName,
      directoryName,
      sha,
    })

    res.status(200).send("OK")
    return next()
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.post("/", attachRollbackRouteHandlerWrapper(this.createMediaFile))
    router.get("/:fileName", attachReadRouteHandlerWrapper(this.readMediaFile))
    router.post(
      "/:fileName",
      attachRollbackRouteHandlerWrapper(this.updateMediaFile)
    )
    router.delete(
      "/:fileName",
      attachRollbackRouteHandlerWrapper(this.deleteMediaFile)
    )

    return router
  }
}

module.exports = { MediaFilesRouter }
