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
  CreatePageRequestSchema,
  UpdatePageRequestSchema,
  DeletePageRequestSchema,
} = require("@validators/RequestSchema")

class CollectionPagesRouter {
  constructor({ collectionPageService, subcollectionPageService }) {
    this.collectionPageService = collectionPageService
    this.subcollectionPageService = subcollectionPageService
    // We need to bind all methods because we don't invoke them from the class directly
    autoBind(this)
  }

  // Create new page in collection
  async createCollectionPage(req, res) {
    const { accessToken } = req

    const { siteName, collectionName, subcollectionName } = req.params
    const { error } = CreatePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter, pageBody },
      newFileName,
    } = req.body
    const reqDetails = { siteName, accessToken }
    let createResp
    if (subcollectionName) {
      createResp = await this.subcollectionPageService.create(reqDetails, {
        fileName: newFileName,
        collectionName,
        content: pageBody,
        frontMatter,
        subcollectionName,
      })
    } else {
      createResp = await this.collectionPageService.create(reqDetails, {
        fileName: newFileName,
        collectionName,
        content: pageBody,
        frontMatter,
      })
    }

    return res.status(200).json(createResp)
  }

  // Read page in collection
  async readCollectionPage(req, res) {
    const { accessToken } = req

    const { siteName, pageName, collectionName, subcollectionName } = req.params

    const reqDetails = { siteName, accessToken }
    let readResp
    if (subcollectionName) {
      readResp = await this.subcollectionPageService.read(reqDetails, {
        fileName: pageName,
        collectionName,
        subcollectionName,
      })
    } else {
      readResp = await this.collectionPageService.read(reqDetails, {
        fileName: pageName,
        collectionName,
      })
    }
    return res.status(200).json(readResp)
  }

  // Update page in collection
  async updateCollectionPage(req, res) {
    const { accessToken } = req

    const { siteName, pageName, collectionName, subcollectionName } = req.params
    const { error } = UpdatePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error)
    const {
      content: { frontMatter, pageBody },
      sha,
      newFileName,
    } = req.body
    const reqDetails = { siteName, accessToken }
    let updateResp
    if (subcollectionName) {
      if (newFileName) {
        updateResp = await this.subcollectionPageService.rename(reqDetails, {
          oldFileName: pageName,
          newFileName,
          collectionName,
          subcollectionName,
          content: pageBody,
          frontMatter,
          sha,
        })
      } else {
        updateResp = await this.subcollectionPageService.update(reqDetails, {
          fileName: pageName,
          collectionName,
          subcollectionName,
          content: pageBody,
          frontMatter,
          sha,
        })
      }
    }
    if (newFileName) {
      updateResp = await this.collectionPageService.rename(reqDetails, {
        oldFileName: pageName,
        newFileName,
        collectionName,
        content: pageBody,
        frontMatter,
        sha,
      })
    } else {
      updateResp = await this.collectionPageService.update(reqDetails, {
        fileName: pageName,
        collectionName,
        content: pageBody,
        frontMatter,
        sha,
      })
    }

    return res.status(200).json(updateResp)
  }

  // Delete page in collection
  async deleteCollectionPage(req, res) {
    const { accessToken } = req

    const { siteName, pageName, collectionName, subcollectionName } = req.params
    const { error } = DeletePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error)
    const { sha } = req.body
    const reqDetails = { siteName, accessToken }
    if (subcollectionName) {
      await this.subcollectionPageService.delete(reqDetails, {
        fileName: pageName,
        collectionName,
        subcollectionName,
        sha,
      })
    } else {
      await this.collectionPageService.delete(reqDetails, {
        fileName: pageName,
        collectionName,
        sha,
      })
    }

    return res.status(200).send("OK")
  }

  getRouter() {
    const router = express.Router()

    router.post(
      "/:siteName/collections/:collectionName/pages",
      attachRollbackRouteHandlerWrapper(this.createCollectionPage)
    )
    router.post(
      "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages",
      attachRollbackRouteHandlerWrapper(this.createCollectionPage)
    )
    router.get(
      "/:siteName/collections/:collectionName/pages/:pageName",
      attachReadRouteHandlerWrapper(this.readCollectionPage)
    )
    router.get(
      "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
      attachReadRouteHandlerWrapper(this.readCollectionPage)
    )
    router.post(
      "/:siteName/collections/:collectionName/pages/:pageName",
      attachWriteRouteHandlerWrapper(this.updateCollectionPage)
    )
    router.post(
      "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
      attachWriteRouteHandlerWrapper(this.updateCollectionPage)
    )
    router.delete(
      "/:siteName/collections/:collectionName/pages/:pageName",
      attachRollbackRouteHandlerWrapper(this.deleteCollectionPage)
    )
    router.delete(
      "/:siteName/collections/:collectionName/subcollections/:subcollectionName/pages/:pageName",
      attachRollbackRouteHandlerWrapper(this.deleteCollectionPage)
    )

    return router
  }
}

module.exports = { CollectionPagesRouter }
