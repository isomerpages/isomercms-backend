const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
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
    const { accessToken } = res.locals

    const { siteName, resourceRoomName, resourceCategoryName } = req.params
    const { error } = CreateResourcePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter, pageBody },
      newFileName,
    } = req.body
    const reqDetails = { siteName, accessToken }
    const createResp = await this.resourcePageService.create(reqDetails, {
      fileName: newFileName,
      resourceRoomName,
      resourceCategoryName,
      content: pageBody,
      frontMatter,
    })

    return res.status(200).json(createResp)
  }

  // Read page in resource category
  async readResourcePage(req, res) {
    const { accessToken } = res.locals

    const {
      siteName,
      resourceRoomName,
      resourceCategoryName,
      pageName,
    } = req.params

    const reqDetails = { siteName, accessToken }
    const readResp = await this.resourcePageService.read(reqDetails, {
      fileName: pageName,
      resourceRoomName,
      resourceCategoryName,
    })

    return res.status(200).json(readResp)
  }

  // Update page in resource category
  async updateResourcePage(req, res) {
    const { accessToken } = res.locals

    const {
      siteName,
      resourceRoomName,
      resourceCategoryName,
      pageName,
    } = req.params
    const { error } = UpdateResourcePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error)
    const {
      content: { frontMatter, pageBody },
      sha,
      newFileName,
    } = req.body
    const reqDetails = { siteName, accessToken }
    let updateResp
    if (newFileName) {
      updateResp = await this.resourcePageService.rename(reqDetails, {
        oldFileName: pageName,
        newFileName,
        resourceRoomName,
        resourceCategoryName,
        content: pageBody,
        frontMatter,
        sha,
      })
    } else {
      updateResp = await this.resourcePageService.update(reqDetails, {
        fileName: pageName,
        resourceRoomName,
        resourceCategoryName,
        content: pageBody,
        frontMatter,
        sha,
      })
    }
    return res.status(200).json(updateResp)
  }

  // Delete page in resource category
  async deleteResourcePage(req, res) {
    const { accessToken } = res.locals

    const {
      siteName,
      resourceRoomName,
      resourceCategoryName,
      pageName,
    } = req.params
    const { error } = DeleteResourcePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error)
    const { sha } = req.body
    const reqDetails = { siteName, accessToken }
    await this.resourcePageService.delete(reqDetails, {
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
