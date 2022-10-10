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
import {
  Commit,
  fromGithubCommitMessage,
  RawFileChangeInfo,
  RawPullRequest,
} from "@root/types/github"

import { isomerRepoAxiosInstance } from "../api/AxiosInstance"

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
  private readonly apiService: typeof isomerRepoAxiosInstance

  private readonly repository: ModelStatic<ReviewRequest>

  private readonly users: ModelStatic<User>

  private readonly reviewers: ModelStatic<Reviewer>

  private readonly reviewMeta: ModelStatic<ReviewMeta>

  constructor(
    apiService: typeof isomerRepoAxiosInstance,
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
    sessionData: UserWithSiteSessionData,
    base = "master",
    head = "staging"
  ): Promise<EditedItemDto[]> => {
    // Step 1: Get the site name
    const { siteName, accessToken } = sessionData

    // Step 2: Get the list of changed files using Github's API
    // Refer here for details; https://docs.github.com/en/rest/commits/commits#compare-two-commits
    // Note that we need a triple dot (...) between base and head refs
    const { files, commits } = await this.apiService
      .get<{ files: RawFileChangeInfo[]; commits: Commit[] }>(
        `${siteName}/compare/${base}...${head}`,
        {
          headers: {
            Authorization: `token ${accessToken}`,
          },
        }
      )
      .then(({ data }) => data)

    const mappings = this.computeShaMappings(commits)

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

  computeShaMappings = (
    commits: Commit[]
  ): Record<string, { author: string; unixTime: number }> => {
    const mappings: Record<string, { author: string; unixTime: number }> = {}

    // NOTE: commits from github are capped at 300.
    // This implies that there might possibly be some files
    // whose commit isn't being returned.
    commits.forEach(({ commit, sha }) => {
      const { userId } = fromGithubCommitMessage(commit.message)
      const lastChangedTime = new Date(commit.author.date).getTime()
      mappings[sha] = {
        author: userId || commit.author.name,
        unixTime: lastChangedTime,
      }
    })
    return mappings
  }

  createReviewRequest = async (
    sessionData: UserWithSiteSessionData,
    reviewers: User[],
    requestor: User,
    site: Site,
    title: string,
    description?: string,
    base = "master",
    head = "staging"
  ): Promise<number> => {
    const { siteName, accessToken } = sessionData
    // Step 1: Create an actual pull request on Github
    // From head -> base
    const pullRequestNumber = await this.apiService
      .post<{ number: number }>(
        `${siteName}/pulls`,
        // NOTE: only create body if a valid description is given
        { title, base, head, ...(description && { body: description }) },
        {
          headers: {
            Authorization: `token ${accessToken}`,
          },
        }
      )
      .then(({ data }) => data.number)

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
      reviewLink: `cms.isomer.gov.sg/sites/${siteName}/review/${reviewRequest.id}`,
    })

    return pullRequestNumber
  }

  listReviewRequest = async (
    { siteName, accessToken }: UserWithSiteSessionData,
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
        const prNumber = req.reviewMeta.pullRequestNumber
        // NOTE: We explicitly destructure as the raw data
        // contains ALOT more than these fields, which we want to
        // discard to lower retrieval times for FE
        const { title, body, changed_files, created_at } = await this.apiService
          .get<RawPullRequest>(`${siteName}/pulls/${prNumber}`, {
            headers: {
              Authorization: `token ${accessToken}`,
            },
          })
          .then(({ data }) => data)

        return {
          id: prNumber,
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
    const { siteName, accessToken } = userWithSiteSessionData
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
    const { title, created_at } = await this.apiService
      .get<RawPullRequest>(`${siteName}/pulls/${pullRequestNumber}`, {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      })
      .then(({ data }) => data)

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

  // NOTE: The semantics of our reviewing system is slightly different from github.
  // The approval is tied to the request, rather than the user.
  approveReviewRequest = async (reviewRequest: ReviewRequest) => {
    reviewRequest.reviewStatus = "APPROVED"
    await reviewRequest.save()
  }

  closePullReviewRequest = async (reviewRequest: ReviewRequest) => {
    reviewRequest.reviewStatus = "CLOSED"
    await reviewRequest.save()
  }

  mergeReviewRequest = async (
    reviewRequest: ReviewRequest
  ): Promise<ReviewRequest | RequestNotFoundError> => {
    const siteName = reviewRequest.site.name
    const { pullRequestNumber } = reviewRequest.reviewMeta

    await this.apiService.post<void>(
      `${siteName}/pulls/${pullRequestNumber}/reviews`,
      {
        event: "APPROVE",
      }
    )
    await this.apiService.put<void>(
      `${siteName}/pulls/${pullRequestNumber}/merge`
    )

    reviewRequest.reviewStatus = "MERGED"
    return reviewRequest.save()
  }
}
