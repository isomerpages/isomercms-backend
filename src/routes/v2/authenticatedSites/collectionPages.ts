import autoBind from "auto-bind"
import express, { NextFunction, Request, Response } from "express"

// Import middleware
import { BadRequestError } from "@errors/BadRequestError"

import {
  attachReadRouteHandlerWrapper,
  attachRollbackRouteHandlerWrapper,
} from "@middleware/routeHandler"

import {
  CreatePageRequestSchema,
  UpdatePageRequestSchema,
  DeletePageRequestSchema,
} from "@validators/RequestSchema"

import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { CollectionPageService } from "@services/fileServices/MdPageServices/CollectionPageService"
import { SubcollectionPageService } from "@services/fileServices/MdPageServices/SubcollectionPageService"

class CollectionPagesRouter {
  collectionPageService: CollectionPageService

  subcollectionPageService: SubcollectionPageService

  constructor({
    collectionPageService,
    subcollectionPageService,
  }: {
    collectionPageService: CollectionPageService
    subcollectionPageService: SubcollectionPageService
  }) {
    this.collectionPageService = collectionPageService
    this.subcollectionPageService = subcollectionPageService
    autoBind(this)
  }

  async createCollectionPage(req: Request, res: Response, next: NextFunction) {
    const { userWithSiteSessionData } = res.locals
    const { collectionName, subcollectionName } = req.params
    const { error } = CreatePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    const {
      content: { frontMatter, pageBody },
      newFileName,
    } = req.body
    let createResp
    if (subcollectionName) {
      createResp = await this.subcollectionPageService.create(
        userWithSiteSessionData,
        {
          fileName: newFileName,
          collectionName,
          content: pageBody,
          frontMatter,
          subcollectionName,
          shouldIgnoreCheck: false,
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
          shouldIgnoreCheck: false,
        }
      )
    }
    res.status(200).json(createResp)
    return next()
  }

  async readCollectionPage(req: Request, res: Response) {
    const { userWithSiteSessionData } = res.locals
    const { pageName, collectionName, subcollectionName } = req.params
    const readResp = await this.getCollectionPage({
      subcollectionName,
      userWithSiteSessionData,
      pageName,
      collectionName,
    })
    return res.status(200).json(readResp)
  }

  async getCollectionPage({
    subcollectionName,
    userWithSiteSessionData,
    pageName,
    collectionName,
  }: {
    subcollectionName: string
    userWithSiteSessionData: UserWithSiteSessionData
    pageName: string
    collectionName: string
  }) {
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
    return readResp
  }

  async updateCollectionPage(req: Request, res: Response, next: NextFunction) {
    const { userWithSiteSessionData } = res.locals
    const { pageName, collectionName, subcollectionName } = req.params
    const { error } = UpdatePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    try {
      await this.getCollectionPage({
        subcollectionName,
        userWithSiteSessionData,
        pageName,
        collectionName,
      })
    } catch (_) {
      res
        .status(404)
        .json("The page that you are trying to edit does not exist")
      return next()
    }
    const {
      content: { frontMatter, pageBody },
      sha,
      newFileName,
    } = req.body
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
    } else if (newFileName) {
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
    res.status(200).json(updateResp)
    return next()
  }

  async deleteCollectionPage(req: Request, res: Response, next: NextFunction) {
    const { userWithSiteSessionData } = res.locals
    const { pageName, collectionName, subcollectionName } = req.params
    const { error } = DeletePageRequestSchema.validate(req.body)
    if (error) throw new BadRequestError(error.message)
    try {
      await this.getCollectionPage({
        subcollectionName,
        userWithSiteSessionData,
        pageName,
        collectionName,
      })
    } catch (_) {
      res
        .status(409)
        .json("The page that you are trying to delete does not exist")
      return next()
    }
    let deleteResp
    if (subcollectionName) {
      deleteResp = await this.subcollectionPageService.delete(
        userWithSiteSessionData,
        {
          fileName: pageName,
          collectionName,
          subcollectionName,
          /**
           * todo: can remove this line after moving
           * subcollectionPageService.delete to use deleteFile
           * into ts and marking this as optional
           * */
          sha: undefined,
        }
      )
    } else {
      deleteResp = await this.collectionPageService.delete(
        userWithSiteSessionData,
        {
          fileName: pageName,
          collectionName,
          /**
           * todo: can remove this line after moving
           * subcollectionPageService.delete to use deleteFile
           * into ts and marking this as optional
           * */
          sha: undefined,
        }
      )
    }
    res.status(200).json(deleteResp)
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
export default CollectionPagesRouter
