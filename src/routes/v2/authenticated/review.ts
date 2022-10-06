import autoBind from "auto-bind"
import express from "express"
import _ from "lodash"

import {
  attachReadRouteHandlerWrapper,
  attachWriteRouteHandlerWrapper,
} from "@middleware/routeHandler"

import UserSessionData from "@classes/UserSessionData"
import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import { CollaboratorRoles } from "@root/constants"
import CollaboratorsService from "@root/services/identity/CollaboratorsService"
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

  private readonly collaboratorsService

  constructor(
    reviewRequestService: ReviewRequestService,
    identityUsersService: UsersService,
    sitesService: SitesService,
    collaboratorsService: CollaboratorsService
  ) {
    this.reviewRequestService = reviewRequestService
    this.identityUsersService = identityUsersService
    this.sitesService = sitesService
    this.collaboratorsService = collaboratorsService

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

    return res.status(200).json({ items: files })
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
    const role = await this.collaboratorsService.getRole(
      siteName,
      userSessionData.isomerUserId
    )

    if (!role || role !== CollaboratorRoles.Admin) {
      return res.status(400).send({
        message: "Only admins can request reviews!",
      })
    }

    const admin = await this.identityUsersService.findByEmail(
      userSessionData.email
    )
    const { reviewers, title, description } = req.body

    // Step 3: Check if reviewers are admins of repo
    const reviewersMap: Record<string, boolean> = {}

    // May we repent for writing such code in production.
    reviewers.forEach((email) => {
      reviewersMap[email] = true
    })

    const collaborators = await this.collaboratorsService.list(
      siteName,
      userSessionData.isomerUserId
    )

    // Filter to get admins,
    // then ensure that they have been requested for review
    const admins = collaborators
      .filter(
        (collaborator) =>
          collaborator.SiteMember.role === CollaboratorRoles.Admin
      )
      .filter((collaborator) => reviewersMap[collaborator.email || ""])

    const areAllReviewersAdmin = admins.length === reviewers.length
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

    const pullRequestNumber = await this.reviewRequestService.createReviewRequest(
      userWithSiteSessionData,
      admins,
      // NOTE: Safe assertion as we first retrieve the role
      // and assert that the user is an admin of said site.
      // This guarantees that the user exists in our database.
      admin!,
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

    router.get("/compare", attachReadRouteHandlerWrapper(this.compareDiff))
    router.post(
      "/request",
      attachWriteRouteHandlerWrapper(this.createReviewRequest)
    )

    return router
  }
}
