import { ModelStatic } from "sequelize"

import UserWithSiteSessionData from "@classes/UserWithSiteSessionData"

import { Reviewer } from "@database/models/Reviewers"
import { ReviewMeta } from "@database/models/ReviewMeta"
import { ReviewRequest } from "@database/models/ReviewRequest"
import { Site } from "@root/database/models/Site"
import { User } from "@root/database/models/User"
import RequestNotFoundError from "@root/errors/RequestNotFoundError"
import {
  DashboardReviewRequestDto,
  EditedItemDto,
  FileType,
  ReviewRequestDto,
} from "@root/types/dto /review"
import { Commit, fromGithubCommitMessage } from "@root/types/github"
import { RequestChangeInfo } from "@root/types/review"
import * as ReviewApi from "@services/db/review"

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

  constructor(
    apiService: typeof ReviewApi,
    users: ModelStatic<User>,
    repository: ModelStatic<ReviewRequest>,
    reviewers: ModelStatic<Reviewer>,
    reviewMeta: ModelStatic<ReviewMeta>
  ) {
    this.apiService = apiService
    this.users = users
    this.repository = repository
    this.reviewers = reviewers
    this.reviewMeta = reviewMeta
  }

  compareDiff = async (
    sessionData: UserWithSiteSessionData
  ): Promise<EditedItemDto[]> => {
    // Step 1: Get the site name
    const { siteName } = sessionData

    // Step 2: Get the list of changed files using Github's API
    // Refer here for details; https://docs.github.com/en/rest/commits/commits#compare-two-commits
    // Note that we need a triple dot (...) between base and head refs
    const { files, commits } = await this.apiService.getCommitDiff(siteName)

    const mappings = await this.computeShaMappings(commits)

    return files.map(({ filename, contents_url }) => {
      const fullPath = filename.split("/")
      const items = contents_url.split("?ref=")
      // NOTE: We have to compute sha this way rather than
      const sha = items[items.length - 1]

      return {
        type: this.computeFileType(filename),
        // NOTE: The string is guaranteed to be non-empty
        // and hence this should exist.
        name: fullPath.pop() || "",
        // NOTE: pop alters in place
        path: fullPath,
        url: this.computeFileUrl(filename, siteName),
        lastEditedBy: mappings[sha]?.author || "Unknown user",
        lastEditedTime: mappings[sha]?.unixTime || 0,
      }
    })
  }

  // TODO
  computeFileType = (filename: string): FileType[] => ["page"]

  computeFileUrl = (filename: string, siteName: string) => "www.google.com"

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

  listReviewRequest = async (
    { siteName }: UserWithSiteSessionData,
    site: Site
  ): Promise<DashboardReviewRequestDto[]> => {
    // Find all review requests associated with the site
    const requests = await this.repository.findAll({
      where: {
        siteId: site.id,
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
    })

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

        return {
          id: pullRequestNumber,
          author: req.requestor.email || "Unknown user",
          status: req.reviewStatus,
          title,
          description: body || "",
          changedFiles: changed_files,
          createdAt: new Date(created_at).getTime(),
          // TODO!
          newComments: 0,
          // TODO!
          firstView: false,
        }
      })
    )
  }

  getReviewRequest = async (site: Site, pullRequestNumber: number) => {
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
        },
      ],
    })

    if (!possibleReviewRequest) {
      return new RequestNotFoundError()
    }

    return possibleReviewRequest
  }

  getFullReviewRequest = async (
    userWithSiteSessionData: UserWithSiteSessionData,
    site: Site,
    pullRequestNumber: number
  ): Promise<ReviewRequestDto | RequestNotFoundError> => {
    const { siteName } = userWithSiteSessionData
    const review = await this.repository.findOne({
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
    })

    // As the db stores github's PR # and (siteName, prNumber)
    // should be a unique identifier for a specific review request,
    // unable to find a RR with the tuple implies that said RR does not exist.
    // This could happen when the user queries for an existing PR that is on github,
    // but created prior to this feature rolling out.
    if (!review) {
      return new RequestNotFoundError()
    }

    // NOTE: We explicitly destructure as the raw data
    // contains ALOT more than these fields, which we want to
    // discard to lower retrieval times for FE
    const { title, created_at } = await this.apiService.getPullRequest(
      siteName,
      pullRequestNumber
    )

    const changedItems = await this.compareDiff(userWithSiteSessionData)

    return {
      reviewUrl: review.reviewMeta.reviewLink,
      title,
      status: review.reviewStatus,
      requestor: review.requestor.email || "",
      reviewers: review.reviewers.map(({ email }) => email || ""),
      reviewRequestedTime: new Date(created_at).getTime(),
      changedItems,
    }
  }

  /**
   * Updates the review request with provided details.
   * Note that the semantics for updating the review request description
   * is as follows:
   *
   * 1. If the body is `undefined`, we **do not** update it.
   * 2. If the body is `""` (an empty string), we update the\
   * github pull request description to be empty too.
   * 3. Otherwise, we just write through to github.
   */
  updateReviewRequest = async (
    reviewRequest: ReviewRequest,
    { title, description, reviewers }: RequestChangeInfo
  ) => {
    // Update db state with new reviewers
    reviewRequest.reviewers = reviewers
    const savePromise = reviewRequest.save()

    const siteName = reviewRequest.site.name
    const { pullRequestNumber } = reviewRequest.reviewMeta

    // Update github state
    const githubUpdatePromise = this.apiService.updatePullRequest(
      siteName,
      pullRequestNumber,
      title,
      description
    )

    await Promise.all([savePromise, githubUpdatePromise])
  }

  // NOTE: The semantics of our reviewing system is slightly different from github.
  // The approval is tied to the request, rather than the user.
  approveReviewRequest = async (reviewRequest: ReviewRequest) => {
    reviewRequest.reviewStatus = "APPROVED"
    await reviewRequest.save()
  }

  closeReviewRequest = async (reviewRequest: ReviewRequest) => {
    const siteName = reviewRequest.site.name
    const { pullRequestNumber } = reviewRequest.reviewMeta
    await this.apiService.closeReviewRequest(siteName, pullRequestNumber)

    reviewRequest.reviewStatus = "CLOSED"
    await reviewRequest.save()
  }

  mergeReviewRequest = async (
    reviewRequest: ReviewRequest
  ): Promise<ReviewRequest | RequestNotFoundError> => {
    const siteName = reviewRequest.site.name
    const { pullRequestNumber } = reviewRequest.reviewMeta

    await this.apiService.approvePullRequest(siteName, pullRequestNumber)
    await this.apiService.mergePullRequest(siteName, pullRequestNumber)

    reviewRequest.reviewStatus = "MERGED"
    return reviewRequest.save()
  }
}
