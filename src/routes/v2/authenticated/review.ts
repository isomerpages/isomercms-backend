import autoBind from "auto-bind"
import express from "express"
import validator from "validator"

import logger from "@logger/logger"

import { BadRequestError } from "@errors/BadRequestError"

import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import UserSessionData from "@classes/UserSessionData"
import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import UsersService from "@root/services/identity/UsersService"
import { isError, RequestHandler } from "@root/types"
import { EditedItemDto } from "@root/types/dto /review"
import ReviewRequestService from "@services/review/ReviewRequestService"
// eslint-disable-next-line import/prefer-default-export
export class ReviewsRouter {
  private readonly reviewRequestService

  private readonly identityUsersService

  constructor(
    reviewRequestService: ReviewRequestService,
    identityUsersService: UsersService
  ) {
    this.reviewRequestService = reviewRequestService
    this.identityUsersService = identityUsersService
    autoBind(this)
  }

  compareDiff: RequestHandler<
    { siteName: string },
    { items: EditedItemDto[] },
    unknown,
    unknown,
    { userSessionData: UserSessionData }
  > = async (req, res) => {
    // Step 1: Check that user exists.
    // Having session data is proof that this user exists
    // as otherwise, they would be rejected by our middleware
    const { userSessionData } = res.locals
    const { siteName } = req.params

    // Check if they have access to site
    const hasAccess = this.identityUsersService.hasAccessToSite(
      userSessionData.isomerUserId,
      siteName
    )

    if (!hasAccess) {
      return res.status(400).send()
    }

    const userWithSiteSessionData = new UserWithSiteSessionData({
      ...userSessionData,
      siteName,
    })

    const files = await this.reviewRequestService.compareDiff(
      userWithSiteSessionData
    )

    return res.json({ items: files }).sendStatus(200)
  }

  createReviewRequest: RequestHandler<
    { siteName: string },
    { reviewers: string[] },
    unknown,
    unknown,
    { userSessionData: UserSessionData }
  > = async (req, res) => {
    // Step 1: Check that user exists.
    // Having session data is proof that this user exists
    // as otherwise, they would be rejected by our middleware
    const { userSessionData } = res.locals
    const { siteName } = req.params

    // Check if they have access to site
    const hasAccess = this.identityUsersService.hasAccessToSite(
      userSessionData.isomerUserId,
      siteName
    )

    if (!hasAccess) {
      return res.status(400).send()
    }

    const userWithSiteSessionData = new UserWithSiteSessionData({
      ...userSessionData,
      siteName,
    })

    // Check if reviewers exist
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.post("/compare", attachReadRouteHandlerWrapper(this.compareDiff))

    return router
  }
}
