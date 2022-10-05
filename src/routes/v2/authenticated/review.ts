import autoBind from "auto-bind"
import express from "express"
import _ from "lodash"

import { attachReadRouteHandlerWrapper } from "@middleware/routeHandler"

import UserSessionData from "@classes/UserSessionData"
import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import { User } from "@root/database/models"
import SitesService from "@root/services/identity/SitesService"
import UsersService from "@root/services/identity/UsersService"
import { RequestHandler } from "@root/types"
import { ResponseErrorBody } from "@root/types/dto /error"
import { EditedItemDto } from "@root/types/dto /review"
import ReviewRequestService from "@services/review/ReviewRequestService"
// eslint-disable-next-line import/prefer-default-export
export class ReviewsRouter {
  private readonly reviewRequestService

  private readonly identityUsersService

  private readonly sitesService

  constructor(
    reviewRequestService: ReviewRequestService,
    identityUsersService: UsersService,
    sitesService: SitesService
  ) {
    this.reviewRequestService = reviewRequestService
    this.identityUsersService = identityUsersService
    this.sitesService = sitesService
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
    { pullRequestNumber: number } | ResponseErrorBody,
    { reviewers: string[]; title: string; description: string },
    unknown,
    { userSessionData: UserSessionData }
  > = async (req, res) => {
    // Step 1: Check that the site exists
    const { siteName } = req.params
    const site = await this.sitesService.getBySiteName(siteName)

    if (!site) {
      return res.status(404).send({
        message:
          "Please ensure that the site you are requesting a review for exists!",
      })
    }

    // Step 2: Check that user exists.
    // Having session data is proof that this user exists
    // as otherwise, they would be rejected by our middleware
    const { userSessionData } = res.locals

    // Check if they are a site admin
    const admin = await this.identityUsersService.isSiteAdmin(
      userSessionData.isomerUserId,
      siteName
    )

    if (!admin) {
      return res.status(400).send({
        message: "Only admins can request reviews!",
      })
    }

    const { reviewers, title, description } = req.body

    // Step 3: Check if reviewers are admins of repo
    const possibleAdmins = await Promise.all(
      reviewers.map((userId) =>
        this.identityUsersService.isSiteAdmin(userId, siteName)
      )
    )
    const areAllReviewersAdmin = _.every(possibleAdmins)

    if (!areAllReviewersAdmin) {
      return res.status(400).send({
        message: "Please ensure that all requested reviewers are admins!",
      })
    }

    // Step 4: Create RR
    const userWithSiteSessionData = new UserWithSiteSessionData({
      ...userSessionData,
      siteName,
    })

    // NOTE: The cast is required as ts is unable to infer that
    // the filter ensures that each item is non-null
    const verifiedReviewers = _.filter(
      possibleAdmins,
      (user) => !!user && user.id !== admin.id
    ) as User[]

    const pullRequestNumber = await this.reviewRequestService.createReviewRequest(
      userWithSiteSessionData,
      verifiedReviewers,
      admin,
      site,
      title,
      description
    )

    return res.status(200).send({
      pullRequestNumber,
    })
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.post("/compare", attachReadRouteHandlerWrapper(this.compareDiff))

    return router
  }
}
