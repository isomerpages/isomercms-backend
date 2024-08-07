const autoBind = require("auto-bind")
const express = require("express")

// Import middleware
const { BadRequestError } = require("@errors/BadRequestError")

const {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} = require("@middleware/routeHandler")

const { recursiveTrimAndReplaceLineBreaks } = require("@utils/yaml-utils")

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
  async createCollectionPage(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { collectionName, subcollectionName } = req.params
    const { error } = CreatePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter, pageBody },
      newFileName: unformattedNewFileName,
    } = req.body
    let createResp
    const newFileName = recursiveTrimAndReplaceLineBreaks(
      unformattedNewFileName
    )
    if (subcollectionName) {
      createResp = await this.subcollectionPageService.create(
        userWithSiteSessionData,
        {
          fileName: newFileName,
          collectionName,
          content: pageBody,
          frontMatter: recursiveTrimAndReplaceLineBreaks(frontMatter),
          subcollectionName,
        }
      )
    } else {
      createResp = await this.collectionPageService.create(
        userWithSiteSessionData,
        {
          fileName: newFileName,
          collectionName,
          content: pageBody,
          frontMatter,
        }
      )
    }

    res.status(200).json(createResp)
    return next()
  }

  // Read page in collection
  async readCollectionPage(req, res) {
    const { userWithSiteSessionData } = res.locals

    const { pageName, collectionName, subcollectionName } = req.params

    let readResp
    if (subcollectionName) {
      readResp = await this.subcollectionPageService.read(
        userWithSiteSessionData,
        {
          fileName: pageName,
          collectionName,
          subcollectionName,
        }
      )
    } else {
      readResp = await this.collectionPageService.read(
        userWithSiteSessionData,
        {
          fileName: pageName,
          collectionName,
        }
      )
    }
    return res.status(200).json(readResp)
  }

  // Update page in collection
  async updateCollectionPage(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { pageName, collectionName, subcollectionName } = req.params
    const { error } = UpdatePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter: unformattedFrontMatter, pageBody },
      sha,
      newFileName: unformattedNewFileName,
    } = req.body
    const frontMatter = recursiveTrimAndReplaceLineBreaks(
      unformattedFrontMatter
    )
    const newFileName = recursiveTrimAndReplaceLineBreaks(
      unformattedNewFileName
    )
    let updateResp
    if (subcollectionName) {
      if (newFileName) {
        updateResp = await this.subcollectionPageService.rename(
          userWithSiteSessionData,
          {
            oldFileName: pageName,
            newFileName,
            collectionName,
            subcollectionName,
            content: pageBody,
            frontMatter,
            sha,
          }
        )
      } else {
        updateResp = await this.subcollectionPageService.update(
          userWithSiteSessionData,
          {
            fileName: pageName,
            collectionName,
            subcollectionName,
            content: pageBody,
            frontMatter,
            sha,
          }
        )
      }
    } else {
      /* eslint-disable no-lonely-if */
      if (newFileName) {
        updateResp = await this.collectionPageService.rename(
          userWithSiteSessionData,
          {
            oldFileName: pageName,
            newFileName,
            collectionName,
            content: pageBody,
            frontMatter,
            sha,
          }
        )
      } else {
        updateResp = await this.collectionPageService.update(
          userWithSiteSessionData,
          {
            fileName: pageName,
            collectionName,
            content: pageBody,
            frontMatter,
            sha,
          }
        )
      }
    }
    res.status(200).json(updateResp)
    return next()
  }

  // Delete page in collection
  async deleteCollectionPage(req, res, next) {
    const { userWithSiteSessionData } = res.locals

    const { pageName, collectionName, subcollectionName } = req.params
    const { error } = DeletePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const { sha } = req.body
    if (subcollectionName) {
      await this.subcollectionPageService.delete(userWithSiteSessionData, {
        fileName: pageName,
        collectionName,
        subcollectionName,
        sha,
      })
    } else {
      await this.collectionPageService.delete(userWithSiteSessionData, {
        fileName: pageName,
        collectionName,
        sha,
      })
    }

    res.status(200).send("OK")
    return next()
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.post(
      "/pages",
      attachRollbackRouteHandlerWrapper(this.createCollectionPage)
    )
    router.post(
      "/subcollections/:subcollectionName/pages",
      attachRollbackRouteHandlerWrapper(this.createCollectionPage)
    )
    router.get(
      "/pages/:pageName",
      attachReadRouteHandlerWrapper(this.readCollectionPage)
    )
    router.get(
      "/subcollections/:subcollectionName/pages/:pageName",
      attachReadRouteHandlerWrapper(this.readCollectionPage)
    )
    router.post(
      "/pages/:pageName",
      attachRollbackRouteHandlerWrapper(this.updateCollectionPage)
    )
    router.post(
      "/subcollections/:subcollectionName/pages/:pageName",
      attachRollbackRouteHandlerWrapper(this.updateCollectionPage)
    )
    router.delete(
      "/pages/:pageName",
      attachRollbackRouteHandlerWrapper(this.deleteCollectionPage)
    )
    router.delete(
      "/subcollections/:subcollectionName/pages/:pageName",
      attachRollbackRouteHandlerWrapper(this.deleteCollectionPage)
    )

    return router
  }
}

module.exports = { CollectionPagesRouter }
