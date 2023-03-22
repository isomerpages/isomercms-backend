import { AxiosResponse } from "axios"
import _ from "lodash"
import {
  err,
  errAsync,
  ok,
  okAsync,
  Result,
  ResultAsync,
  combine,
} from "neverthrow"
import { Op, ModelStatic } from "sequelize"

import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import { ALLOWED_FILE_EXTENSIONS } from "@utils/file-upload-utils"

import { Reviewer } from "@database/models/Reviewers"
import { ReviewMeta } from "@database/models/ReviewMeta"
import { ReviewRequest } from "@database/models/ReviewRequest"
import { ReviewRequestStatus } from "@root/constants"
import { Repo, ReviewRequestView } from "@root/database/models"
import { Site } from "@root/database/models/Site"
import { User } from "@root/database/models/User"
import { BaseIsomerError } from "@root/errors/BaseError"
import ConfigParseError from "@root/errors/ConfigParseError"
import DatabaseError from "@root/errors/DatabaseError"
import MissingResourceRoomError from "@root/errors/MissingResourceRoomError"
import NetworkError from "@root/errors/NetworkError"
import { NotFoundError } from "@root/errors/NotFoundError"
import PageParseError from "@root/errors/PageParseError"
import RequestNotFoundError from "@root/errors/RequestNotFoundError"
import {
  BaseEditedItemDto,
  CommentItem,
  DashboardReviewRequestDto,
  EditedConfigDto,
  EditedItemDto,
  EditedMediaDto,
  EditedPageDto,
  GithubCommentData,
  ReviewRequestDto,
  WithEditMeta,
} from "@root/types/dto/review"
import { isIsomerError } from "@root/types/error"
import {
  Commit,
  fromGithubCommitMessage,
  RawFileChangeInfo,
} from "@root/types/github"
import { PathInfo, StagingPermalink } from "@root/types/pages"
import { RequestChangeInfo } from "@root/types/review"
import { extractPathInfo, getFileExt } from "@root/utils/files"
import * as ReviewApi from "@services/db/review"

import { PageService } from "../fileServices/MdPageServices/PageService"
import { ConfigService } from "../fileServices/YmlFileServices/ConfigService"

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
  private readonly apiService: typeof ReviewApi

  private readonly repository: ModelStatic<ReviewRequest>

  private readonly users: ModelStatic<User>

  private readonly reviewers: ModelStatic<Reviewer>

  private readonly reviewMeta: ModelStatic<ReviewMeta>

  private readonly reviewRequestView: ModelStatic<ReviewRequestView>

  private readonly pageService: PageService

  private readonly configService: ConfigService

  constructor(
    apiService: typeof ReviewApi,
    users: ModelStatic<User>,
    repository: ModelStatic<ReviewRequest>,
    reviewers: ModelStatic<Reviewer>,
    reviewMeta: ModelStatic<ReviewMeta>,
    reviewRequestView: ModelStatic<ReviewRequestView>,
    pageService: PageService,
    configService: ConfigService
  ) {
    this.apiService = apiService
    this.users = users
    this.repository = repository
    this.reviewers = reviewers
    this.reviewMeta = reviewMeta
    this.reviewRequestView = reviewRequestView
    this.pageService = pageService
    this.configService = configService
  }

  compareDiff = (
    userWithSiteSessionData: UserWithSiteSessionData,
    stagingLink: StagingPermalink
  ) =>
    ResultAsync.fromPromise(
      this.apiService.getCommitDiff(userWithSiteSessionData.siteName),
      // TODO: Write a handler for github errors to our own internal errors
      () => new NetworkError()
    )
      .andThen(({ files, commits }) =>
        ResultAsync.fromPromise(
          this.computeShaMappings(commits),
          () => new DatabaseError()
        ).map((mappings) => ({ mappings, files }))
      )
      .andThen(({ mappings, files }) =>
        combine(
          this.compareDiffWithMappings(
            userWithSiteSessionData,
            stagingLink,
            files,
            mappings
          ).map((res) =>
            res
              // NOTE: Need to type-hint so that we can recover
              .andThen<
                BaseEditedItemDto | WithEditMeta<EditedItemDto>,
                BaseEditedItemDto
              >(_.identity)
              .orElse((baseItem) => okAsync(baseItem))
          )
        )
      )

  private compareDiffWithMappings = (
    sessionData: UserWithSiteSessionData,
    stagingLink: StagingPermalink,
    files: RawFileChangeInfo[],
    mappings: Record<
      string,
      {
        author: string
        unixTime: number
      }
    >
  ): ResultAsync<WithEditMeta<EditedItemDto>, BaseEditedItemDto>[] => {
    // Step 1: Get the site name
    const { siteName } = sessionData

    return files.map(({ filename, contents_url: contents }) => {
      const extractedPathResult = extractPathInfo(filename)
      if (extractedPathResult.isErr()) {
        return errAsync({
          name: "",
          path: [],
          type: "file",
        })
      }

      const pathInfo = extractedPathResult.value

      return this.extractConfigInfo(pathInfo)
        .orElse(() => this.extractMediaInfo(pathInfo))
        .asyncMap<EditedItemDto>(_.identity)
        .orElse(() =>
          this.extractPageInfo(pathInfo, sessionData, stagingLink, siteName)
        )
        .map<WithEditMeta<EditedItemDto>>((item) => {
          const items = contents.split("?ref=")
          // NOTE: We have to compute sha this way rather than
          // taking the file sha.
          // This is because the sha present on the file is
          // a checksum of the files contents.
          // And the actual commit sha is given by the ref param
          const hash = items[items.length - 1]
          return {
            ...item,
            lastEditedBy: mappings[hash]?.author || "Unknown user",
            lastEditedTime: mappings[hash]?.unixTime || 0,
          }
        })

        .orElse<BaseEditedItemDto>(() => {
          const { path, name } = pathInfo
          return errAsync({
            name,
            path: path.unwrapOr([]),
            type: "page",
          })
        })
    })
  }

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
        combine([
          this.pageService.retrieveCmsPermalink(pageName, siteName),
          this.pageService.retrieveStagingPermalink(
            sessionData,
            stagingLink,
            pageName
          ),
        ])
      )
      .map(([fileUrl, stagingUrl]) => ({
        type: "page",
        // NOTE: The string is guaranteed to be non-empty
        // and hence this should exist.
        name,
        path: path.unwrapOr([""]),
        stagingUrl,
        fileUrl,
      }))
  }

  extractMediaInfo = ({
    name,
    path,
  }: PathInfo): Result<EditedMediaDto, PageParseError> => {
    const fileExt = getFileExt(name)
    if (ALLOWED_FILE_EXTENSIONS.includes(fileExt)) {
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
      const isNav = true
      return {
        name,
        path: path.unwrapOr([""]),
        type: isNav ? "nav" : "setting",
      }
    })

  computeShaMappings = async (
    commits: Commit[]
  ): Promise<Record<string, { author: string; unixTime: number }>> => {
    const mappings: Record<string, { author: string; unixTime: number }> = {}

    // NOTE: commits from github are capped at 300.
    // This implies that there might possibly be some files
    // whose commit isn't being returned.
    await Promise.all(
      commits.map(async ({ commit, sha }) => {
        const { userId } = fromGithubCommitMessage(commit.message)
        const author = await this.users.findByPk(userId)
        const lastChangedTime = new Date(commit.author.date).getTime()
        mappings[sha] = {
          author: author?.email || commit.author.name,
          unixTime: lastChangedTime,
        }
      })
    )
    return mappings
  }

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
    await Promise.all(
      reviewers.map(({ id }) =>
        this.reviewers.create({
          requestId: reviewRequest.id,
          reviewerId: id,
        })
      )
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
          changed_files,
          created_at,
        } = await this.apiService.getPullRequest(siteName, pullRequestNumber)

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
          changedFiles: changed_files,
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
    const { isomerUserId: userId } = sessionData

    const requestsViewed = await this.reviewRequestView.findAll({
      where: {
        siteId: site.id,
        userId,
      },
    })

    const allActiveRequests = await this.repository.findAll({
      where: {
        siteId: site.id,
        // NOTE: Closed and merged review requests would not have an
        // entry in the review request views table
        reviewStatus: ["OPEN", "APPROVED"],
      },
    })

    const requestIdsViewed = requestsViewed.map(
      (request) => request.reviewRequestId
    )
    const allActiveRequestIds = allActiveRequests.map((request) => request.id)
    const requestIdsToMarkAsViewed = _.difference(
      allActiveRequestIds,
      requestIdsViewed
    )

    await Promise.all(
      // Using map here to allow creations to be done concurrently
      // But we do not actually need the result of the view creation
      requestIdsToMarkAsViewed.map(async (requestId) =>
        this.reviewRequestView.create({
          reviewRequestId: requestId,
          siteId: site.id,
          userId,
          // This field represents the user opening the review request
          // itself, which the user has not done so yet at this stage.
          lastViewedAt: null,
        })
      )
    )
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

    reviewRequest.reviewStatus = ReviewRequestStatus.Merged
    return reviewRequest.save()
  }

  createComment = async (
    sessionData: UserWithSiteSessionData,
    pullRequestNumber: number,
    message: string
  ): Promise<AxiosResponse<void>> => {
    const { siteName, isomerUserId } = sessionData

    return this.apiService.createComment(
      siteName,
      pullRequestNumber,
      isomerUserId,
      message
    )
  }

  getComments = async (
    sessionData: UserWithSiteSessionData,
    site: Site,
    pullRequestNumber: number
  ): Promise<CommentItem[]> => {
    const { siteName, isomerUserId: userId } = sessionData

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

    return this.computeCommentData(comments, viewedTime)
  }

  getBlob = async (repo: string, path: string, ref: string): Promise<string> =>
    this.apiService.getBlob(repo, path, ref)
}
