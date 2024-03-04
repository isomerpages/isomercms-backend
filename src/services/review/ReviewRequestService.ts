import _, { sortBy, unionBy } from "lodash"
import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow"
import { Op, ModelStatic } from "sequelize"
import { Sequelize } from "sequelize-typescript"

import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import { ALLOWED_FILE_EXTENSIONS } from "@utils/file-upload-utils"

import { Reviewer } from "@database/models/Reviewers"
import { ReviewMeta } from "@database/models/ReviewMeta"
import { ReviewRequest } from "@database/models/ReviewRequest"
import { ReviewRequestStatus } from "@root/constants"
import { Repo, ReviewComment, ReviewRequestView } from "@root/database/models"
import { Site } from "@root/database/models/Site"
import { User } from "@root/database/models/User"
import { BaseIsomerError } from "@root/errors/BaseError"
import ConfigParseError from "@root/errors/ConfigParseError"
import DatabaseError from "@root/errors/DatabaseError"
import GitFileSystemError from "@root/errors/GitFileSystemError"
import MissingResourceRoomError from "@root/errors/MissingResourceRoomError"
import { NotFoundError } from "@root/errors/NotFoundError"
import PageParseError from "@root/errors/PageParseError"
import PlaceholderParseError from "@root/errors/PlaceholderParseError"
import RequestNotFoundError from "@root/errors/RequestNotFoundError"
import logger from "@root/logger/logger"
import {
  CommentItem,
  DashboardReviewRequestDto,
  DisplayedEditedItemDto,
  EditedConfigDto,
  EditedItemDto,
  EditedMediaDto,
  EditedPageDto,
  EditedPlaceholderDto,
  GithubCommentData,
  ReviewRequestDto,
  WithEditMeta,
} from "@root/types/dto/review"
import { isIsomerError } from "@root/types/error"
import { fromGithubCommitMessage } from "@root/types/github"
import { StagingPermalink } from "@root/types/pages"
import { RequestChangeInfo } from "@root/types/review"
import { PathInfo } from "@root/types/util"
import { extractPathInfo, getFileExt } from "@root/utils/files"

import RepoService from "../db/RepoService"
import { PageService } from "../fileServices/MdPageServices/PageService"
import PlaceholderService from "../fileServices/utils/PlaceholderService"
import { ConfigService } from "../fileServices/YmlFileServices/ConfigService"
import MailClient from "../utilServices/MailClient"

import ReviewCommentService from "./ReviewCommentService"

/**
 * NOTE: This class does not belong as a subset of GitHub service.
 * This is because GitHub service exists to operate on _files_
 * whereas this operates on pull requests.
 *
 * Perhaps we could rename Github service into GitHubFile service
 * and this into GitHubPullRequest service to make the distinction obvious.
 *
 * Separately, this also allows us to add typings into this service.
 */
export default class ReviewRequestService {
  private readonly apiService: RepoService

  private readonly reviewCommentService: ReviewCommentService

  private readonly mailer: MailClient

  private readonly repository: ModelStatic<ReviewRequest>

  private readonly users: ModelStatic<User>

  private readonly reviewers: ModelStatic<Reviewer>

  private readonly reviewMeta: ModelStatic<ReviewMeta>

  private readonly reviewRequestView: ModelStatic<ReviewRequestView>

  private readonly pageService: PageService

  private readonly configService: ConfigService

  private readonly sequelize: Sequelize

  constructor(
    apiService: RepoService,
    reviewCommentService: ReviewCommentService,
    mailer: MailClient,
    users: ModelStatic<User>,
    repository: ModelStatic<ReviewRequest>,
    reviewers: ModelStatic<Reviewer>,
    reviewMeta: ModelStatic<ReviewMeta>,
    reviewRequestView: ModelStatic<ReviewRequestView>,
    pageService: PageService,
    configService: ConfigService,
    sequelize: Sequelize
  ) {
    this.apiService = apiService
    this.reviewCommentService = reviewCommentService
    this.mailer = mailer
    this.users = users
    this.repository = repository
    this.reviewers = reviewers
    this.reviewMeta = reviewMeta
    this.reviewRequestView = reviewRequestView
    this.pageService = pageService
    this.configService = configService
    this.sequelize = sequelize
  }

  compareDiff = (
    userWithSiteSessionData: UserWithSiteSessionData,
    stagingLink: StagingPermalink
  ): ResultAsync<WithEditMeta<DisplayedEditedItemDto>[], GitFileSystemError> =>
    this.apiService
      .getFilesChanged(userWithSiteSessionData.siteName)
      .andThen((filenames) => {
        // map each filename to its edit metadata
        const editMetadata = filenames.map((filename) =>
          this.createEditedItemDtoWithEditMeta(
            filename,
            userWithSiteSessionData,
            stagingLink
          )
        )
        return ResultAsync.combine(editMetadata)
      })
      .map((changedItems) =>
        changedItems.filter(
          (changedItem): changedItem is WithEditMeta<DisplayedEditedItemDto> =>
            changedItem.type !== "placeholder"
        )
      )

  createEditedItemDtoWithEditMeta = (
    filename: string,
    sessionData: UserWithSiteSessionData,
    stagingLink: StagingPermalink
  ): ResultAsync<WithEditMeta<EditedItemDto>, never> => {
    const { siteName } = sessionData
    const editMeta = this.extractEditMeta(siteName, filename)
    const editedItemInfo = this.extractEditedItemInfo(
      filename,
      sessionData,
      stagingLink
    )

    return ResultAsync.combine([editMeta, editedItemInfo]).map(
      ([editMetadata, item]) => ({
        ...item,
        ...editMetadata,
      })
    )
  }

  extractEditMeta = (siteName: string, filename: string) =>
    this.apiService
      .getLatestLocalCommitOfPath(siteName, filename)
      .andThen((latestLog) => {
        const { userId } = fromGithubCommitMessage(latestLog.message)
        return ResultAsync.fromPromise(
          this.users.findByPk(userId),
          () => new DatabaseError()
        ).map((author) => ({
          lastEditedBy: author?.email || latestLog.author_email,
          lastEditedTime: new Date(latestLog.date).getTime(),
        }))
      })
      .orElse(() =>
        ok({
          lastEditedBy: "Unknown",
          lastEditedTime: 0,
        })
      )

  extractEditedItemInfo = (
    filename: string,
    sessionData: UserWithSiteSessionData,
    stagingLink: StagingPermalink
  ): ResultAsync<EditedItemDto, never> =>
    extractPathInfo(filename)
      .asyncMap(async (pathInfo) => pathInfo)
      .andThen((pathInfo) =>
        this.extractConfigInfo(pathInfo)
          .orElse(() => this.extractPlaceholderInfo(pathInfo))
          .orElse(() => this.extractMediaInfo(pathInfo))
          .asyncMap<EditedItemDto>(async (item) => item)
          .orElse(() =>
            this.extractPageInfo(
              pathInfo,
              sessionData,
              stagingLink,
              sessionData.siteName
            )
          )
          .orElse(() => {
            const { path, name } = pathInfo
            return okAsync<EditedItemDto>({
              name,
              path: path.unwrapOr([]),
              type: "page",
              stagingUrl: "",
              cmsFileUrl: "",
            })
          })
      )
      .orElse(() =>
        okAsync<EditedItemDto>({
          name: "",
          path: [],
          type: "page",
          stagingUrl: "",
          cmsFileUrl: "",
        })
      )

  extractPageInfo = (
    pathInfo: PathInfo,
    sessionData: UserWithSiteSessionData,
    stagingLink: StagingPermalink,
    siteName: string
  ): ResultAsync<
    EditedPageDto,
    BaseIsomerError | NotFoundError | MissingResourceRoomError
  > => {
    const { name, path } = pathInfo
    return this.pageService
      .parsePageName(pathInfo, sessionData)
      .andThen((pageName) =>
        ResultAsync.combine([
          this.pageService.retrieveCmsPermalink(pageName, siteName),
          this.pageService.retrieveStagingPermalink(
            sessionData,
            stagingLink,
            pageName
          ),
        ])
      )
      .map(([cmsFileUrl, stagingUrl]) => ({
        type: "page",
        // NOTE: The string is guaranteed to be non-empty
        // and hence this should exist.
        name,
        path: path.unwrapOr([]),
        stagingUrl,
        cmsFileUrl,
      }))
  }

  extractMediaInfo = ({
    name,
    path,
  }: PathInfo): Result<EditedMediaDto, PageParseError> => {
    const fileExt = getFileExt(name)
    if (ALLOWED_FILE_EXTENSIONS.includes(fileExt.toLowerCase())) {
      return ok({
        name,
        path: path.unwrapOr([""]),
        type: fileExt === "pdf" ? "file" : "image",
      })
    }

    return err(new PageParseError(name))
  }

  extractConfigInfo = (
    pathInfo: PathInfo
  ): Result<EditedConfigDto, ConfigParseError> =>
    this.configService.isConfigFile(pathInfo).map(({ name, path }) => {
      const isNav =
        name === "navigation.yml" &&
        path.isOk() &&
        path.value.length === 1 &&
        path.value.at(0) === "_data"
      return {
        name,
        path: path.unwrapOr([""]),
        type: isNav ? "nav" : "setting",
      }
    })

  extractPlaceholderInfo = (
    pathInfo: PathInfo
  ): Result<EditedPlaceholderDto, PlaceholderParseError> =>
    PlaceholderService.isPlaceholderFile(pathInfo).map(({ name, path }) => ({
      name,
      path: path.unwrapOr([""]),
      type: "placeholder",
    }))

  computeCommentData = async (
    comments: GithubCommentData[],
    viewedTime: Date | null
  ) => {
    const mappings = await Promise.all(
      comments.map(async ({ userId, message, createdAt }) => {
        const createdTime = new Date(createdAt)
        const author = await this.users.findByPk(userId)
        return {
          user: author?.email || "",
          message,
          createdAt: createdTime.getTime(),
          isRead: viewedTime ? createdTime < viewedTime : false,
        }
      })
    )
    return mappings
  }

  createReviewRequest = async (
    sessionData: UserWithSiteSessionData,
    reviewers: User[],
    requestor: User,
    site: Site,
    title: string,
    description?: string
  ): Promise<number> => {
    const { siteName } = sessionData
    // Step 1: Create an actual pull request on Github
    // From head -> base
    const pullRequestNumber = await this.apiService.createPullRequest(
      siteName,
      title,
      description
    )

    // Step 2: Only update internal model state once PR is created
    const reviewRequest = await this.repository.create({
      requestorId: requestor.id,
      siteId: site.id,
    })
    const subject = `[${siteName}] You've been requested to review some changes`
    const emailBody = `<p>Hi there,</p>
    <p>${requestor.email} has requested you to review and approve changes made to ${siteName}. You can see the changes and approve them, or add comments for site collaborators to see.</p>
    <br />
    <p><a href="https://cms.isomer.gov.sg/sites/${siteName}/review/${pullRequestNumber}" target="_blank">Click to see the review request on IsomerCMS</a></p>
    <br />
    <p>If this is your first time approving or publishing a review request, <a href="https://guide.isomer.gov.sg/publish-changes-and-site-launch/for-email-login-users/approve-and-publish-a-review-request" target="_blank">this article from our Isomer Guide</a> might help.</p>
    <br />
    <p>Best,<br />
    The Isomer Team</p>`
    await Promise.all(
      reviewers.map(async ({ id, email: reviewerEmail }) => {
        await this.reviewers.create({
          requestId: reviewRequest.id,
          reviewerId: id,
        })
        if (!reviewerEmail) {
          // Should not reach here
          throw new Error(`Reviewer with id ${id} has no email`)
        }
        try {
          await this.mailer.sendMail(reviewerEmail, subject, emailBody)
        } catch (mailerErr) {
          // Non-blocking
          logger.error(
            `Error when sending reviewer mail to ${reviewerEmail}: ${mailerErr}`
          )
        }
      })
    )

    await this.reviewMeta.create({
      reviewId: reviewRequest.id,
      pullRequestNumber,
      reviewLink: `cms.isomer.gov.sg/sites/${siteName}/review/${pullRequestNumber}`,
    })

    return pullRequestNumber
  }

  listValidReviewRequests = async (
    sessionData: UserWithSiteSessionData,
    site: Site
  ): Promise<DashboardReviewRequestDto[]> => {
    const { siteName, isomerUserId: userId } = sessionData

    // Find all review requests associated with the site
    // TODO: Note this needs to be findAll when we reach a stage of allowing
    // multiple open PRs simultaneously
    // Current behaviour returns the newest Open PR based on created_at field
    const request = await this.repository.findOne({
      where: {
        siteId: site.id,
        [Op.or]: [
          {
            reviewStatus: ReviewRequestStatus.Open,
          },
          { reviewStatus: ReviewRequestStatus.Approved },
        ],
      },
      include: [
        {
          model: ReviewMeta,
          as: "reviewMeta",
        },
        {
          model: User,
          as: "requestor",
        },
      ],
      order: [["created_at", "DESC"]],
    })

    // NOTE: Doing this so that we can easily change back to using
    // findAll once ready
    const requests = request ? [request] : []

    // NOTE: This has a max of 30 pull requests
    // and returns only open pull requests.
    return Promise.all(
      requests.map(async (req) => {
        const { pullRequestNumber } = req.reviewMeta
        // NOTE: We explicitly destructure as the raw data
        // contains ALOT more than these fields, which we want to
        // discard to lower retrieval times for FE
        const {
          title,
          body,
          created_at,
        } = await this.apiService.getPullRequest(siteName, pullRequestNumber)
        const { files } = await this.apiService.getCommitDiff(siteName)
        const displayedFiles = files
          .filter((file) => {
            const extractPlaceholderFileResult = extractPathInfo(
              file.filename
            ).andThen((pathInfo) =>
              PlaceholderService.isPlaceholderFile(pathInfo)
            )
            return extractPlaceholderFileResult.isErr()
          })
          .map((file) => file.filename)

        // It is the user's first view if the review request views table
        // does not contain a record for the user and the review request
        const isFirstView = !(await this.reviewRequestView.count({
          where: {
            reviewRequestId: req.id,
            siteId: site.id,
            userId,
          },
        }))

        // It is a new comment to the user if any of the following
        // conditions satisfy:
        // 1. The review request views table does not contain a record
        //    for the user and the review request.
        // 2. The review request views table contains a record for that
        //    user and review request, but the lastViewedAt entry is NULL.
        // 3. The review request views table contains a record in the
        //    lastViewedAt entry, and the comment has a timestamp greater
        //    than the one stored in the database.
        const allComments = await this.getComments(
          sessionData,
          site,
          pullRequestNumber
        )
        const countNewComments = await Promise.all(
          allComments.map(async (value) => value.isRead)
        ).then((arr) => {
          const unreadComments = arr.filter((isRead) => !isRead)
          return unreadComments.length
        })

        return {
          id: pullRequestNumber,
          author: req.requestor.email || "Unknown user",
          status: req.reviewStatus,
          title,
          description: body || "",
          changedFiles: displayedFiles.length,
          createdAt: new Date(created_at).getTime(),
          newComments: countNewComments,
          firstView: isFirstView,
        }
      })
    )
  }

  markAllReviewRequestsAsViewed = async (
    sessionData: UserWithSiteSessionData,
    site: Site
  ): Promise<void> => {
    try {
      const { isomerUserId: userId } = sessionData
      await this.sequelize.transaction(async (transaction) => {
        const requestsViewed = await this.reviewRequestView.findAll({
          where: {
            siteId: site.id,
            userId,
          },
          transaction,
        })

        const allActiveRequests = await this.repository.findAll({
          where: {
            siteId: site.id,
            reviewStatus: ["OPEN", "APPROVED"],
          },
          transaction,
        })

        const requestIdsViewed = requestsViewed.map(
          (request) => request.reviewRequestId
        )
        const allActiveRequestIds = allActiveRequests.map(
          (request) => request.id
        )
        const requestIdsToMarkAsViewed = _.difference(
          allActiveRequestIds,
          requestIdsViewed
        )

        await Promise.all(
          requestIdsToMarkAsViewed.map(async (requestId) =>
            this.reviewRequestView.create(
              {
                reviewRequestId: requestId,
                siteId: site.id,
                userId,
                lastViewedAt: null,
              },
              { transaction }
            )
          )
        )
      })
    } catch (error) {
      // NOTE: If execution reaches this line, the transaction has already rolled back
      logger.info({
        message: "Failed to mark all review requests as viewed",
        error,
      })
    }
  }

  updateReviewRequestLastViewedAt = async (
    sessionData: UserWithSiteSessionData,
    site: Site,
    reviewRequest: ReviewRequest
  ): Promise<void | RequestNotFoundError> => {
    const { isomerUserId: userId } = sessionData
    const { id: reviewRequestId } = reviewRequest

    await this.reviewRequestView.upsert({
      reviewRequestId,
      siteId: site.id,
      userId,
      lastViewedAt: new Date(),
    })
  }

  markReviewRequestAsViewed = async (
    sessionData: UserWithSiteSessionData,
    site: Site,
    requestId: number
  ): Promise<void> => {
    const { isomerUserId: userId } = sessionData

    const reviewRequestView = await this.reviewRequestView.findOne({
      where: {
        siteId: site.id,
        userId,
        reviewRequestId: requestId,
      },
    })

    // We only want to create the entry if it does not exist
    // (i.e. the review request has never been viewed before)
    if (!reviewRequestView) {
      await this.reviewRequestView.create({
        reviewRequestId: requestId,
        siteId: site.id,
        userId,
        // This field represents the user opening the review request
        // itself, which the user has not done so yet at this stage.
        lastViewedAt: null,
      })
    }
  }

  deleteAllReviewRequestViews = async (
    site: Site,
    pullRequestNumber: number
  ): Promise<number | RequestNotFoundError> => {
    const possibleReviewRequest = await this.getReviewRequest(
      site,
      pullRequestNumber
    )

    if (isIsomerError(possibleReviewRequest)) {
      return possibleReviewRequest
    }

    const { id: reviewRequestId } = possibleReviewRequest

    return this.reviewRequestView.destroy({
      where: {
        reviewRequestId,
        siteId: site.id,
      },
    })
  }

  getReviewRequest = async (
    site: Site,
    pullRequestNumber: number
  ): Promise<ReviewRequest | RequestNotFoundError> => {
    const possibleReviewRequest = await this.repository.findOne({
      where: {
        siteId: site.id,
      },
      include: [
        {
          model: ReviewMeta,
          as: "reviewMeta",
          where: {
            pullRequestNumber,
          },
        },
        {
          model: User,
          as: "requestor",
        },
        {
          model: User,
          as: "reviewers",
        },
        {
          model: Site,
          include: [Repo],
        },
      ],
    })

    if (!possibleReviewRequest) {
      return new RequestNotFoundError()
    }

    return possibleReviewRequest
  }

  getLatestMergedReviewRequest = (
    site: Site
  ): ResultAsync<ReviewRequest, RequestNotFoundError> =>
    ResultAsync.fromPromise(
      this.repository.findOne({
        where: {
          siteId: site.id,
          reviewStatus: ReviewRequestStatus.Merged,
        },
        include: [
          {
            model: ReviewMeta,
            as: "reviewMeta",
          },
          {
            model: User,
            as: "requestor",
          },
          {
            model: User,
            as: "reviewers",
          },
          {
            model: Site,
          },
        ],
        order: [
          [
            {
              model: ReviewMeta,
              as: "reviewMeta",
            },
            "pullRequestNumber",
            "DESC",
          ],
        ],
      }),
      () => new RequestNotFoundError()
    ).andThen((possibleReviewRequest) => {
      if (!possibleReviewRequest) {
        return errAsync(new RequestNotFoundError())
      }
      return okAsync(possibleReviewRequest)
    })

  getFullReviewRequest = (
    userWithSiteSessionData: UserWithSiteSessionData,
    site: Site,
    pullRequestNumber: number,
    stagingLink: StagingPermalink
  ): ResultAsync<ReviewRequestDto, RequestNotFoundError> => {
    const { siteName } = userWithSiteSessionData
    return ResultAsync.fromPromise(
      this.repository.findOne({
        where: {
          siteId: site.id,
        },
        include: [
          {
            model: ReviewMeta,
            as: "reviewMeta",
            where: {
              pullRequestNumber,
            },
          },
          {
            model: User,
            as: "requestor",
          },
          {
            model: User,
            as: "reviewers",
          },
          {
            model: Site,
          },
        ],
      }),
      () => new RequestNotFoundError()
    )
      .andThen((reviewRequest) =>
        // As the db stores github's PR # and (siteName, prNumber)
        // should be a unique identifier for a specific review request,
        // unable to find a RR with the tuple implies that said RR does not exist.
        // This could happen when the user queries for an existing PR that is on github,
        // but created prior to this feature rolling out.
        reviewRequest
          ? okAsync(reviewRequest)
          : errAsync(new RequestNotFoundError())
      )
      .andThen(({ reviewMeta, reviewStatus, requestor, reviewers }) =>
        ResultAsync.fromPromise(
          this.apiService.getPullRequest(siteName, pullRequestNumber),
          // NOTE: Because we validate existence of the pull request
          // and the site, the error here is not the fault of the user.
          // It might be due to credentials or network issues, both of which
          // are hidden behind our backend.
          () => new NotFoundError()
        ) // NOTE: We explicitly destructure as the raw data
          // contains ALOT more than these fields, which we want to
          // discard to lower retrieval times for FE
          .map(({ title, created_at }) => ({
            reviewUrl: reviewMeta.reviewLink,
            title,
            status: reviewStatus,
            requestor: requestor.email || "",
            reviewers: reviewers.map(({ email }) => email || ""),
            reviewRequestedTime: new Date(created_at).getTime(),
          }))
      )
      .andThen((rest) =>
        // Step 2: Get the list of changed files using Github's API
        // Refer here for details; https://docs.github.com/en/rest/commits/commits#compare-two-commits
        // Note that we need a triple dot (...) between base and head refs
        this.compareDiff(userWithSiteSessionData, stagingLink).map(
          (changedItems) => ({
            ...rest,
            changedItems,
          })
        )
      )
  }

  updateReviewRequest = async (
    reviewRequest: ReviewRequest,
    { reviewers }: RequestChangeInfo
  ): Promise<void> => {
    // Update db state with new reviewers
    await reviewRequest.$set("reviewers", reviewers)
    await reviewRequest.save()
  }

  // NOTE: The semantics of our reviewing system is slightly different from github.
  // The approval is tied to the request, rather than the user.
  approveReviewRequest = async (
    reviewRequest: ReviewRequest
  ): Promise<void> => {
    reviewRequest.reviewStatus = ReviewRequestStatus.Approved
    await reviewRequest.save()
  }

  deleteReviewRequestApproval = async (
    reviewRequest: ReviewRequest
  ): Promise<void> => {
    reviewRequest.reviewStatus = ReviewRequestStatus.Open
    await reviewRequest.save()
  }

  closeReviewRequest = async (reviewRequest: ReviewRequest): Promise<void> => {
    const { repo } = reviewRequest.site
    if (!repo) throw new RequestNotFoundError("Repo not found")
    const repoNameInGithub = repo.name
    const { pullRequestNumber } = reviewRequest.reviewMeta
    await this.apiService.closeReviewRequest(
      repoNameInGithub,
      pullRequestNumber
    )

    reviewRequest.reviewStatus = ReviewRequestStatus.Closed
    await reviewRequest.save()
  }

  mergeReviewRequest = async (
    reviewRequest: ReviewRequest
  ): Promise<ReviewRequest | RequestNotFoundError> => {
    const { repo } = reviewRequest.site
    if (!repo) throw new RequestNotFoundError("Repo not found")
    const repoNameInGithub = repo.name
    const { pullRequestNumber } = reviewRequest.reviewMeta
    await this.apiService.approvePullRequest(
      repoNameInGithub,
      pullRequestNumber
    )

    await this.apiService.mergePullRequest(repoNameInGithub, pullRequestNumber)
    await this.apiService.mergeStagingToMaster(repoNameInGithub)

    reviewRequest.reviewStatus = ReviewRequestStatus.Merged
    return reviewRequest.save()
  }

  createComment = async (
    sessionData: UserWithSiteSessionData,
    pullRequestNumber: number,
    message: string
  ): Promise<ReviewComment> => {
    const { siteName, isomerUserId } = sessionData

    logger.info(
      `Creating comment for PR ${pullRequestNumber}, site: ${siteName}`
    )
    // get id of review request
    const reviewMeta = await this.reviewMeta.findOne({
      where: { pullRequestNumber },
    })

    if (reviewMeta?.reviewId) {
      try {
        return await this.reviewCommentService.createCommentForReviewRequest(
          reviewMeta?.reviewId,
          isomerUserId,
          message
        )
      } catch (e) {
        logger.error(
          `Error creating comment in DB for PR ${pullRequestNumber}, site: ${siteName}`
        )
        throw new DatabaseError("Error creating comment in DB")
      }
    }
    logger.info(`No review request found for PR ${pullRequestNumber}`)
    throw new RequestNotFoundError("Review Request not found")
  }

  getComments = async (
    sessionData: UserWithSiteSessionData,
    site: Site,
    pullRequestNumber: number
  ): Promise<CommentItem[]> => {
    const { siteName, isomerUserId: userId } = sessionData

    // get review request id
    const reviewMeta = await this.reviewMeta.findOne({
      where: { pullRequestNumber },
    })
    if (!reviewMeta || !reviewMeta.reviewId) {
      throw new RequestNotFoundError("Review Request not found")
    }

    const comments = await this.apiService.getComments(
      siteName,
      pullRequestNumber
    )

    const requestsView = await this.reviewRequestView.findOne({
      where: {
        siteId: site.id,
        userId,
      },
      include: [
        {
          model: ReviewRequest,
          required: true,
          include: [
            {
              model: ReviewMeta,
              required: true,
              where: {
                pullRequestNumber,
              },
            },
          ],
        },
      ],
    })

    const viewedTime = requestsView ? new Date(requestsView.lastViewedAt) : null
    let allComments = []
    try {
      allComments = await this.reviewCommentService.getCommentsForReviewRequest(
        reviewMeta.reviewId
      )
    } catch (e) {
      logger.error(
        `Error getting comments for PR ${pullRequestNumber}, site: ${siteName}`
      )
      throw new DatabaseError("Error getting comments for PR")
    }

    // if comments exist in DB return those, else return from GitHub
    let commentsFromDB: CommentItem[] = []
    if (allComments && allComments.length !== 0) {
      commentsFromDB = allComments.map((rawComment) => ({
        user: rawComment.user.email || "",
        createdAt: rawComment.createdAt.getTime(),
        message: rawComment.comment,
        isRead: viewedTime ? rawComment.createdAt < viewedTime : false,
      }))
    }
    // Note: temporarily till all existing RRs depending on GitHub
    // are merged, we will combine both the DB and GitHub without
    // duplicates
    // TODO: Remove after dependency of GitHub is removed
    const commentsFromGitHub = await this.computeCommentData(
      comments,
      viewedTime
    )
    return sortBy(
      unionBy(commentsFromDB, commentsFromGitHub, "message"),
      "createdAt"
    )
  }

  getBlob = async (repo: string, path: string, ref: string): Promise<string> =>
    this.apiService.getBlob(repo, path, ref)
}
