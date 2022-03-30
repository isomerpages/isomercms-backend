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
  async createMediaFile(req, res) {
    const { accessToken } = req

    const { siteName, directoryName } = req.params
    const { error } = CreateMediaFileRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { content, newFileName } = req.body
    const reqDetails = { siteName, accessToken }
    const createResp = await this.mediaFileService.create(reqDetails, {
      fileName: newFileName,
      directoryName,
      content,
    })

    return res.status(200).json(createResp)
  }

  // Read page in collection
  async readMediaFile(req, res) {
    const { accessToken } = req

    const { siteName, fileName, directoryName } = req.params

    const reqDetails = { siteName, accessToken }
    const readResp = await this.mediaFileService.read(reqDetails, {
      fileName,
      directoryName,
    })
    return res.status(200).json(readResp)
  }

  // Update page in collection
  async updateMediaFile(req, res) {
    const { accessToken, currentCommitSha, treeSha } = req

    const { siteName, fileName, directoryName } = req.params
    const { error } = UpdateMediaFileRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error)
    const { content, sha, newFileName } = req.body
    const reqDetails = { siteName, accessToken, currentCommitSha, treeSha }
    let updateResp
    if (newFileName) {
      updateResp = await this.mediaFileService.rename(reqDetails, {
        oldFileName: fileName,
        newFileName,
        directoryName,
        content,
        sha,
      })
    } else {
      updateResp = await this.mediaFileService.update(reqDetails, {
        fileName,
        directoryName,
        content,
        sha,
      })
    }
    return res.status(200).json(updateResp)
  }

  // Delete page in collection
  async deleteMediaFile(req, res) {
    const { accessToken } = req

    const { siteName, fileName, directoryName } = req.params
    const { error } = DeleteMediaFileRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error)
    const { sha } = req.body
    const reqDetails = { siteName, accessToken }
    await this.mediaFileService.delete(reqDetails, {
      fileName,
      directoryName,
      sha,
    })

    return res.status(200).send("OK")
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
