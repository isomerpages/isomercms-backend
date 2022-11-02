import autoBind from "auto-bind"
import express from "express"
import _ from "lodash"

import logger from "@logger/logger"

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
import { isIsomerError, RequestHandler } from "@root/types"
import { ResponseErrorBody } from "@root/types/dto/error"
import {
  CommentItem,
  DashboardReviewRequestDto,
  EditedItemDto,
  UpdateReviewRequestDto,
  ReviewRequestDto,
} from "@root/types/dto/review"
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
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    // Step 1: Check that user exists.
    // Having session data is proof that this user exists
    // as otherwise, they would be rejected by our middleware
    const { userWithSiteSessionData } = res.locals
    const { siteName } = req.params

    // Check if they have access to site
    const possibleSiteMember = this.identityUsersService.getSiteMember(
      userWithSiteSessionData.isomerUserId,
      siteName
    )

    if (!possibleSiteMember) {
      return res.status(404).send()
    }

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
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    // Step 1: Check that the site exists
    const { siteName } = req.params
    const site = await this.sitesService.getBySiteName(siteName)
    const { userWithSiteSessionData } = res.locals

    if (!site) {
      logger.error({
        message: "Invalid site requested",
        method: "createReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
        },
      })
      return res.status(404).send({
        message:
          "Please ensure that the site you are requesting a review for exists!",
      })
    }

    // Step 2: Check that user exists.
    // Having session data is proof that this user exists
    // as otherwise, they would be rejected by our middleware
    // Check if they are a site admin
    const role = await this.collaboratorsService.getRole(
      siteName,
      userWithSiteSessionData.isomerUserId
    )

    if (!role || role !== CollaboratorRoles.Admin) {
      logger.error({
        message:
          "User attempted to create review request with invalid permissions",
        method: "createReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
        },
      })
      return res.status(404).send({
        message: "Only admins can request reviews!",
      })
    }

    const admin = await this.identityUsersService.findByEmail(
      userWithSiteSessionData.email
    )
    const { reviewers, title, description } = req.body

    // Step 3: Check if reviewers are admins of repo
    // Check if number of requested reviewers > 0
    if (reviewers.length === 0) {
      res.status(400).json({
        message: "Please ensure that you have selected at least 1 reviewer!",
      })
    }
    const reviewersMap: Record<string, boolean> = {}

    // May we repent for writing such code in production.
    reviewers.forEach((email) => {
      reviewersMap[email] = true
    })

    const collaborators = await this.collaboratorsService.list(
      siteName,
      userWithSiteSessionData.isomerUserId
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

  listReviews: RequestHandler<
    { siteName: string },
    { reviews: DashboardReviewRequestDto[] } | ResponseErrorBody,
    never,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    // Step 1: Check that the site exists
    const { siteName } = req.params
    const site = await this.sitesService.getBySiteName(siteName)
    const { userWithSiteSessionData } = res.locals

    if (!site) {
      logger.error({
        message: "Invalid site requested",
        method: "listReviews",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
        },
      })
      return res.status(404).send({
        message: "Please ensure that the site exists!",
      })
    }

    // Step 2: Check that user exists.
    // Having session data is proof that this user exists
    // as otherwise, they would be rejected by our middleware
    // Check if they are a collaborator
    const role = await this.collaboratorsService.getRole(
      siteName,
      userWithSiteSessionData.isomerUserId
    )

    if (!role) {
      logger.error({
        message: "Insufficient permissions to view review request",
        method: "listReviews",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
        },
      })
      return res.status(404).send({
        message: "Only collaborators of a site can view reviews!",
      })
    }

    // Step 3: Fetch data and return
    const reviews = await this.reviewRequestService.listReviewRequest(
      userWithSiteSessionData,
      site
    )

    return res.status(200).json({
      reviews,
    })
  }

  markAllReviewRequestsAsViewed: RequestHandler<
    { siteName: string },
    string | ResponseErrorBody,
    never,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    // Step 1: Check that the site exists
    const { siteName } = req.params
    const site = await this.sitesService.getBySiteName(siteName)

    if (!site) {
      return res.status(404).send({
        message: "Please ensure that the site exists!",
      })
    }

    // Step 2: Check that user exists.
    // Having session data is proof that this user exists
    // as otherwise, they would be rejected by our middleware
    const { userWithSiteSessionData } = res.locals

    // Check if they are a collaborator
    const role = await this.collaboratorsService.getRole(
      siteName,
      userWithSiteSessionData.isomerUserId
    )

    if (!role) {
      return res.status(400).send({
        message: "User is not a collaborator of this site!",
      })
    }

    // Step 3: Update all review requests for the site as viewed
    await this.reviewRequestService.markAllReviewRequestsAsViewed(
      userWithSiteSessionData,
      site
    )

    return res.status(200).json()
  }

  markReviewRequestAsViewed: RequestHandler<
    { siteName: string; requestId: number },
    string | ResponseErrorBody,
    never,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    // Step 1: Check that the site exists
    const { siteName, requestId: prNumber } = req.params
    const site = await this.sitesService.getBySiteName(siteName)

    if (!site) {
      return res.status(404).send({
        message: "Please ensure that the site exists!",
      })
    }

    // Step 2: Check that user exists.
    // Having session data is proof that this user exists
    // as otherwise, they would be rejected by our middleware
    const { userWithSiteSessionData } = res.locals

    // Check if they are a collaborator
    const role = await this.collaboratorsService.getRole(
      siteName,
      userWithSiteSessionData.isomerUserId
    )

    if (!role) {
      return res.status(400).send({
        message: "User is not a collaborator of this site!",
      })
    }

    // Step 3: Retrieve review request
    const possibleReviewRequest = await this.reviewRequestService.getReviewRequest(
      site,
      prNumber
    )

    if (isIsomerError(possibleReviewRequest)) {
      logger.error({
        message: "Invalid review request requested",
        method: "markReviewRequestAsViewed",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
          prNumber,
        },
      })
      return res.status(404).json({ message: possibleReviewRequest.message })
    }

    // Step 4: Mark review request as viewed
    await this.reviewRequestService.markReviewRequestAsViewed(
      userWithSiteSessionData,
      site,
      possibleReviewRequest.id
    )

    return res.status(200).json()
  }

  getReviewRequest: RequestHandler<
    { siteName: string; requestId: number },
    { reviewRequest: ReviewRequestDto } | ResponseErrorBody,
    never,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    // Step 1: Check that the site exists
    const { siteName, requestId } = req.params
    const { userWithSiteSessionData } = res.locals
    const site = await this.sitesService.getBySiteName(siteName)

    if (!site) {
      logger.error({
        message: "Invalid site requested",
        method: "getReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
          requestId,
        },
      })
      return res.status(404).send({
        message: "Please ensure that the site exists!",
      })
    }

    // Step 2: Check that user exists.
    // Having session data is proof that this user exists
    // as otherwise, they would be rejected by our middleware
    // Check if they are a collaborator
    const role = await this.collaboratorsService.getRole(
      siteName,
      userWithSiteSessionData.isomerUserId
    )

    if (!role) {
      logger.error({
        message: "Insufficient permissions to retrieve review request",
        method: "getReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
          requestId,
        },
      })
      return res.status(404).send({
        message: "Only collaborators of a site can view reviews!",
      })
    }

    const possibleReviewRequest = await this.reviewRequestService.getFullReviewRequest(
      userWithSiteSessionData,
      site,
      requestId
    )

    if (isIsomerError(possibleReviewRequest)) {
      logger.error({
        message: "Invalid review request requested",
        method: "getReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
          requestId,
        },
      })
      return res.status(possibleReviewRequest.status).send({
        message: possibleReviewRequest.message,
      })
    }

    return res.status(200).json({ reviewRequest: possibleReviewRequest })
  }

  updateReviewRequest: RequestHandler<
    { siteName: string; requestId: number },
    ResponseErrorBody,
    UpdateReviewRequestDto,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    // Step 1: Check that the site exists
    const { siteName, requestId } = req.params
    const { userWithSiteSessionData } = res.locals
    const site = await this.sitesService.getBySiteName(siteName)

    if (!site) {
      logger.error({
        message: "Invalid site requested",
        method: "updateReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
          requestId,
        },
      })
      return res.status(404).send({
        message: "Please ensure that the site exists!",
      })
    }

    // Step 2: Retrieve review request
    const possibleReviewRequest = await this.reviewRequestService.getReviewRequest(
      site,
      requestId
    )

    if (isIsomerError(possibleReviewRequest)) {
      logger.error({
        message: "Invalid review request requested",
        method: "updateReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
          requestId,
        },
      })
      return res.status(404).json({ message: possibleReviewRequest.message })
    }

    // Step 3: Check that the user updating is the requestor
    const { requestor } = possibleReviewRequest
    if (requestor.email !== userWithSiteSessionData.email) {
      logger.error({
        message: "Insufficient permissions to update review request",
        method: "updateReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
          requestId,
        },
      })
      return res.status(403).json({
        message: "Only requestors can update the review request!",
      })
    }

    // Step 4: Check that all new reviewers are admins of the site
    const { reviewers } = req.body
    const collaborators = await this.collaboratorsService.list(siteName)
    const collaboratorMappings = Object.fromEntries(
      reviewers.map((reviewer) => [reviewer, true])
    )
    const verifiedReviewers = collaborators.filter(
      (collaborator) =>
        collaborator.SiteMember.role === CollaboratorRoles.Admin &&
        // NOTE: We check for existence of email on the user - since this
        // is an identity feature, we assume that **all** users calling this endpoint
        // will have a valid email (guaranteed by our modal)
        collaborator.email &&
        !!collaboratorMappings[collaborator.email]
    )

    if (verifiedReviewers.length !== reviewers.length) {
      return res.status(400).json({
        message:
          "Please ensure that all requested reviewers are admins of the site!",
      })
    }

    // Step 5: Update the rr with the appropriate details
    await this.reviewRequestService.updateReviewRequest(possibleReviewRequest, {
      reviewers: verifiedReviewers,
    })

    return res.status(200).send()
  }

  mergeReviewRequest: RequestHandler<
    { siteName: string; requestId: number },
    ResponseErrorBody,
    never,
    unknown,
    { userSessionData: UserSessionData }
  > = async (req, res) => {
    // Step 1: Check that the site exists
    const { siteName, requestId } = req.params
    const { userSessionData } = res.locals
    const site = await this.sitesService.getBySiteName(siteName)

    if (!site) {
      logger.error({
        message: "Invalid site requested",
        method: "mergeReviewRequest",
        meta: {
          userId: userSessionData.isomerUserId,
          email: userSessionData.email,
          siteName,
        },
      })
      return res.status(404).send({
        message: "Please ensure that the site exists!",
      })
    }

    // Step 2: Check that user exists.
    // Having session data is proof that this user exists
    // as otherwise, they would be rejected by our middleware
    // Check if they are a collaborator
    const role = await this.collaboratorsService.getRole(
      siteName,
      userSessionData.isomerUserId
    )

    if (!role) {
      logger.error({
        message: "Insufficient permissions to merge review request",
        method: "mergeReviewRequest",
        meta: {
          userId: userSessionData.isomerUserId,
          email: userSessionData.email,
          siteName,
          requestId,
        },
      })
      return res.status(404).send({
        message: "Only collaborators of a site can view reviews!",
      })
    }

    // Step 3: Retrieve review request
    const possibleReviewRequest = await this.reviewRequestService.getReviewRequest(
      site,
      requestId
    )

    if (isIsomerError(possibleReviewRequest)) {
      logger.error({
        message: "Invalid review request requested",
        method: "mergeReviewRequest",
        meta: {
          userId: userSessionData.isomerUserId,
          email: userSessionData.email,
          siteName,
          requestId,
        },
      })
      return res.status(404).json({ message: possibleReviewRequest.message })
    }

    // Step 4: Merge review request
    // NOTE: We are not checking for existence of PR
    // as the underlying Github API returns 404 if
    // the requested review could not be found.
    await this.reviewRequestService.mergeReviewRequest(possibleReviewRequest)

    // Step 5: Clean up the review request view records
    // The error is discarded as we are guaranteed to have a review request
    await this.reviewRequestService.deleteAllReviewRequestViews(site, requestId)

    return res.status(200).send()
  }

  approveReviewRequest: RequestHandler<
    { siteName: string; requestId: number },
    ResponseErrorBody,
    never,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    // Step 1: Check that the site exists
    const { siteName, requestId } = req.params
    const { userWithSiteSessionData } = res.locals
    const site = await this.sitesService.getBySiteName(siteName)

    if (!site) {
      logger.error({
        message: "Invalid site requested",
        method: "approveReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
        },
      })
      return res.status(404).send({
        message: "Please ensure that the site exists!",
      })
    }

    // Step 3: Retrieve review request
    const possibleReviewRequest = await this.reviewRequestService.getReviewRequest(
      site,
      requestId
    )

    if (isIsomerError(possibleReviewRequest)) {
      logger.error({
        message: "Invalid review request requested",
        method: "approveReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
          requestId,
        },
      })
      return res.status(404).send({
        message: "Please ensure that the site exists!",
      })
    }

    // Step 4: Check if the user is a reviewer of the RR
    const { reviewers } = possibleReviewRequest
    const isReviewer = _.some(
      reviewers,
      (user) => user.email === userWithSiteSessionData.email
    )

    if (!isReviewer) {
      logger.error({
        message: "Insufficient permissions to approve review request",
        method: "approveReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
        },
      })
      return res.status(403).send({
        message: "Please ensure that you are a reviewer of the review request!",
      })
    }

    // Step 5: Approve review request
    // NOTE: We are not checking for existence of PR
    // as the underlying Github API returns 404 if
    // the requested review could not be found.
    await this.reviewRequestService.approveReviewRequest(possibleReviewRequest)
    return res.status(200).send()
  }

  getComments: RequestHandler<
    { siteName: string; requestId: number },
    CommentItem[] | ResponseErrorBody,
    never,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { siteName, requestId } = req.params
    const { userWithSiteSessionData } = res.locals
    // Step 1: Check that the site exists
    const site = await this.sitesService.getBySiteName(siteName)
    if (!site) {
      logger.error({
        message: "Invalid site requested",
        method: "getComments",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
        },
      })
      return res.status(404).send({
        message: "Please ensure that the site exists!",
      })
    }

    // Step 2: Retrieve comments
    const comments = await this.reviewRequestService.getComments(
      userWithSiteSessionData,
      site,
      requestId
    )

    return res.status(200).json(comments)
  }

  createComment: RequestHandler<
    { siteName: string; requestId: number },
    string,
    { message: string },
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    const { requestId } = req.params
    const { message } = req.body
    const { userWithSiteSessionData } = res.locals
    await this.reviewRequestService.createComment(
      userWithSiteSessionData,
      requestId,
      message
    )

    return res.status(200).send("OK")
  }

  markReviewRequestCommentsAsViewed: RequestHandler<
    { siteName: string; requestId: number },
    string | ResponseErrorBody,
    never,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    // Step 1: Check that the site exists
    const { siteName, requestId } = req.params
    const site = await this.sitesService.getBySiteName(siteName)

    if (!site) {
      return res.status(404).send({
        message: "Please ensure that the site exists!",
      })
    }

    // Step 2: Check that user exists.
    // Having session data is proof that this user exists
    // as otherwise, they would be rejected by our middleware
    const { userWithSiteSessionData } = res.locals

    // Check if they are a collaborator
    const role = await this.collaboratorsService.getRole(
      siteName,
      userWithSiteSessionData.isomerUserId
    )

    if (!role) {
      return res.status(400).send({
        message: "User is not a collaborator of this site!",
      })
    }

    // Step 3: Retrieve review request
    const possibleReviewRequest = await this.reviewRequestService.getReviewRequest(
      site,
      requestId
    )

    if (isIsomerError(possibleReviewRequest)) {
      return res.status(404).json({ message: possibleReviewRequest.message })
    }

    // Step 4: Update user's last viewed timestamp for the review request
    await this.reviewRequestService.updateReviewRequestLastViewedAt(
      userWithSiteSessionData,
      site,
      possibleReviewRequest
    )

    return res.status(200).json()
  }

  closeReviewRequest: RequestHandler<
    { siteName: string; requestId: number },
    ResponseErrorBody,
    never,
    unknown,
    { userWithSiteSessionData: UserWithSiteSessionData }
  > = async (req, res) => {
    // Step 1: Check that the site exists
    const { siteName, requestId } = req.params
    const { userWithSiteSessionData } = res.locals
    const site = await this.sitesService.getBySiteName(siteName)

    if (!site) {
      logger.error({
        message: "Invalid site requested",
        method: "closeReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
        },
      })
      return res.status(404).send({
        message: "Please ensure that the site exists!",
      })
    }

    // Step 3: Retrieve review request
    const possibleReviewRequest = await this.reviewRequestService.getReviewRequest(
      site,
      requestId
    )

    if (isIsomerError(possibleReviewRequest)) {
      logger.error({
        message: "Invalid review request requested",
        method: "closeReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
          requestId,
        },
      })
      return res
        .status(possibleReviewRequest.status)
        .json({ message: possibleReviewRequest.message })
    }

    // Step 4: Check if the user is the requestor
    const { requestor } = possibleReviewRequest
    const isRequestor = requestor.email === userWithSiteSessionData.email
    if (!isRequestor) {
      logger.error({
        message: "Insufficient permissions to close review request",
        method: "closeReviewRequest",
        meta: {
          userId: userWithSiteSessionData.isomerUserId,
          email: userWithSiteSessionData.email,
          siteName,
          requestId,
        },
      })
      return res.status(404).json({
        message: "Only the requestor can close the Review Request!",
      })
    }

    // Step 5: Close review request
    // NOTE: We are not checking for existence of PR
    // as the underlying Github API returns 404 if
    // the requested review could not be found.
    await this.reviewRequestService.closeReviewRequest(possibleReviewRequest)

    // Step 6: Clean up the review request view records
    // The error is discarded as we are guaranteed to have a review request
    await this.reviewRequestService.deleteAllReviewRequestViews(site, requestId)

    return res.status(200).send()
  }

  getRouter() {
    const router = express.Router({ mergeParams: true })

    router.get("/compare", attachReadRouteHandlerWrapper(this.compareDiff))
    router.post(
      "/request",
      attachWriteRouteHandlerWrapper(this.createReviewRequest)
    )
    router.get("/summary", attachReadRouteHandlerWrapper(this.listReviews))
    router.post(
      "/viewed",
      attachWriteRouteHandlerWrapper(this.markAllReviewRequestsAsViewed)
    )
    router.get(
      "/:requestId",
      attachReadRouteHandlerWrapper(this.getReviewRequest)
    )
    router.post(
      "/:requestId/viewed",
      attachWriteRouteHandlerWrapper(this.markReviewRequestAsViewed)
    )
    router.post(
      "/:requestId/merge",
      attachWriteRouteHandlerWrapper(this.mergeReviewRequest)
    )
    router.post(
      "/:requestId/approve",
      attachReadRouteHandlerWrapper(this.approveReviewRequest)
    )
    router.get(
      "/:requestId/comments",
      attachWriteRouteHandlerWrapper(this.getComments)
    )
    router.post(
      "/:requestId/comments",
      attachWriteRouteHandlerWrapper(this.createComment)
    )
    router.post(
      "/:requestId/comments/viewedComments",
      attachWriteRouteHandlerWrapper(this.markReviewRequestCommentsAsViewed)
    )
    router.post(
      "/:requestId",
      attachWriteRouteHandlerWrapper(this.updateReviewRequest)
    )
    router.delete(
      "/:requestId",
      attachReadRouteHandlerWrapper(this.closeReviewRequest)
    )

    return router
  }
}
