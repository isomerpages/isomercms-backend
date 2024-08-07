import _ from "lodash"
import { errAsync, okAsync, ResultAsync } from "neverthrow"
import { ModelStatic } from "sequelize"

import { Deployment, Repo, Site } from "@database/models"
import type UserSessionData from "@root/classes/UserSessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import DatabaseError from "@root/errors/DatabaseError"
import MissingSiteError from "@root/errors/MissingSiteError"
import MissingUserEmailError from "@root/errors/MissingUserEmailError"
import MissingUserError from "@root/errors/MissingUserError"
import { NotFoundError } from "@root/errors/NotFoundError"
import { UnprocessableError } from "@root/errors/UnprocessableError"
import logger from "@root/logger/logger"
import PreviewService from "@root/services/identity/PreviewService"
import {
  getAllRepoData,
  SitesCacheService,
} from "@root/services/identity/SitesCacheService"
import { AmplifyError } from "@root/types"
import { GitHubCommitData } from "@root/types/commitData"
import { ConfigYmlData } from "@root/types/configYml"
import { ProdPermalink, StagingPermalink } from "@root/types/pages"
import { PreviewInfo } from "@root/types/previewInfo"
import type { RepositoryData, SiteUrls } from "@root/types/repoInfo"
import { SiteInfo } from "@root/types/siteInfo"
import { StagingBuildStatus } from "@root/types/stagingBuildStatus"
import { Brand } from "@root/types/util"
import {
  isReduceBuildTimesWhitelistedRepo,
  isShowStagingBuildStatusWhitelistedRepo,
} from "@root/utils/growthbook-utils"
import { safeJsonParse } from "@root/utils/json"
import RepoService from "@services/db/RepoService"
import { ConfigYmlService } from "@services/fileServices/YmlFileServices/ConfigYmlService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import UsersService from "@services/identity/UsersService"
import ReviewRequestService from "@services/review/ReviewRequestService"

import DeploymentsService from "./DeploymentsService"

interface SitesServiceProps {
  siteRepository: ModelStatic<Site>
  gitHubService: RepoService
  configYmlService: ConfigYmlService
  usersService: UsersService
  isomerAdminsService: IsomerAdminsService
  reviewRequestService: ReviewRequestService
  sitesCacheService: SitesCacheService
  previewService: PreviewService
  deploymentsService: DeploymentsService
}

class SitesService {
  // NOTE: Explicitly specifying using keyed properties to ensure
  // that the types are synced.
  private readonly siteRepository: SitesServiceProps["siteRepository"]

  private readonly gitHubService: SitesServiceProps["gitHubService"]

  private readonly configYmlService: SitesServiceProps["configYmlService"]

  private readonly usersService: SitesServiceProps["usersService"]

  private readonly isomerAdminsService: SitesServiceProps["isomerAdminsService"]

  private readonly reviewRequestService: SitesServiceProps["reviewRequestService"]

  private readonly sitesCacheService: SitesServiceProps["sitesCacheService"]

  private readonly previewService: SitesServiceProps["previewService"]

  private readonly deploymentsService: SitesServiceProps["deploymentsService"]

  constructor({
    siteRepository,
    gitHubService,
    configYmlService,
    usersService,
    isomerAdminsService,
    reviewRequestService,
    sitesCacheService,
    previewService,
    deploymentsService,
  }: SitesServiceProps) {
    this.siteRepository = siteRepository
    this.gitHubService = gitHubService
    this.configYmlService = configYmlService
    this.usersService = usersService
    this.isomerAdminsService = isomerAdminsService
    this.reviewRequestService = reviewRequestService
    this.sitesCacheService = sitesCacheService
    this.previewService = previewService
    this.deploymentsService = deploymentsService
  }

  isGitHubCommitData(commit: unknown): commit is GitHubCommitData {
    return (
      !!commit &&
      (commit as GitHubCommitData).author !== undefined &&
      (commit as GitHubCommitData).author.name !== undefined &&
      (commit as GitHubCommitData).author.date !== undefined &&
      (commit as GitHubCommitData).author.email !== undefined &&
      (commit as GitHubCommitData).message !== undefined
    )
  }

  extractAuthorEmail(commit: GitHubCommitData): string {
    const {
      author: { email: authorEmail },
    } = commit
    return authorEmail
  }

  insertUrlsFromConfigYml(
    siteUrls: SiteUrls,
    sessionData: UserWithSiteSessionData
  ): ResultAsync<SiteUrls, NotFoundError> {
    if (siteUrls.staging && siteUrls.prod) {
      // We call ConfigYmlService only when necessary
      return okAsync(siteUrls)
    }

    return ResultAsync.fromPromise(
      this.configYmlService.read(sessionData),
      () => new NotFoundError()
    ).map<SiteUrls>(
      ({ content: configYmlData }: { content: ConfigYmlData }) => ({
        staging:
          configYmlData.staging && !siteUrls.staging
            ? configYmlData.staging
            : siteUrls.staging,
        prod:
          configYmlData.prod && !siteUrls.prod
            ? configYmlData.prod
            : siteUrls.prod,
      })
    )
  }

  insertUrlsFromGitHubDescription(
    siteUrls: SiteUrls,
    sessionData: UserWithSiteSessionData
  ): ResultAsync<SiteUrls, NotFoundError> {
    if (siteUrls.staging && siteUrls.prod) {
      // We call GitHubService only when necessary
      return okAsync(siteUrls)
    }

    return ResultAsync.fromPromise(
      this.gitHubService.getRepoInfo(sessionData),
      () => new NotFoundError()
    ).map(({ description }: { description: string }) => {
      // Retrieve the url from the description
      // repo descriptions have varying formats, so we look for the first link
      const repoDescTokens = description.replace("/;/g", " ").split(" ")

      const stagingUrlFromDesc = repoDescTokens.find(
        (token) => token.includes("http") && token.includes("staging")
      )
      const prodUrlFromDesc = repoDescTokens.find(
        (token) => token.includes("http") && token.includes("prod")
      )

      // Only replace the urls if they are not already present
      return {
        staging:
          stagingUrlFromDesc && !siteUrls.staging
            ? Brand.fromString(stagingUrlFromDesc)
            : siteUrls.staging,
        prod:
          prodUrlFromDesc && !siteUrls.prod
            ? Brand.fromString(prodUrlFromDesc)
            : siteUrls.prod,
      }
    })
  }

  getBySiteName(siteName: string): ResultAsync<Site, MissingSiteError> {
    return ResultAsync.fromPromise(
      this.siteRepository.findOne({
        include: [
          {
            model: Repo,
            where: {
              name: siteName,
            },
          },
        ],
      }),
      () => new MissingSiteError()
    ).andThen((site) => {
      if (!site) {
        return errAsync(new MissingSiteError())
      }
      return okAsync(site)
    })
  }

  async getSitesForEmailUser(userId: string): Promise<(string | undefined)[]> {
    const user = await this.usersService.findSitesByUserId(userId)

    if (!user) {
      return []
    }

    return user.site_members.map((site) => site.repo?.name)
  }

  getCommitAuthorEmail(
    commit: GitHubCommitData
  ): ResultAsync<
    string,
    UnprocessableError | MissingUserError | MissingUserEmailError
  > {
    const { message } = commit

    // Commit message created as part of phase 2 identity
    if (message.startsWith("{") && message.endsWith("}")) {
      return safeJsonParse(message)
        .map(
          (obj) =>
            // TODO: write a validator for this instead of cast as this is unsafe
            obj as { userId: string }
        )
        .asyncAndThen(({ userId }) =>
          ResultAsync.fromPromise(
            this.usersService.findById(userId),
            () => new MissingUserError()
          )
        )
        .andThen((user) => {
          if (!user) {
            return errAsync(new MissingUserError())
          }
          return okAsync(user)
        })
        .andThen(({ email }) => {
          if (!email) {
            return errAsync(new MissingUserEmailError())
          }
          return okAsync(email)
        })
    }

    // Legacy style of commits, or if the user is not found
    return okAsync(this.extractAuthorEmail(commit))
  }

  getMergeAuthorEmail(
    commit: GitHubCommitData,
    sessionData: UserWithSiteSessionData
  ): ResultAsync<string, never> {
    const {
      author: { name: authorName },
    } = commit
    const { siteName } = sessionData

    if (!authorName.startsWith("isomergithub")) {
      // Legacy style of commits, or if the user is not found
      return okAsync(this.extractAuthorEmail(commit))
    }

    // Commit was made by our common identity GitHub user
    return this.getBySiteName(siteName)
      .andThen(this.reviewRequestService.getLatestMergedReviewRequest)
      .andThen(({ requestor: { email: requestorEmail } }) => {
        if (requestorEmail) {
          return okAsync(requestorEmail)
        }
        return okAsync(this.extractAuthorEmail(commit))
      })
      .orElse(() => okAsync(this.extractAuthorEmail(commit)))
  }

  async updateDbWithStagingUrl(site: Site, stagingUrl: StagingPermalink) {
    this.deploymentsService.updateStagingUrl(site.id, stagingUrl)
  }

  // Tries to get the site urls in the following order:
  // 1. From the deployments database table
  // 2. From the config.yml file
  // 3. From the GitHub repository description
  // Otherwise, returns a NotFoundError
  getUrlsOfSite(
    sessionData: UserWithSiteSessionData
  ): ResultAsync<SiteUrls, NotFoundError> {
    return (
      ResultAsync.fromPromise(
        this.siteRepository.findOne({
          include: [
            {
              model: Deployment,
              as: "deployment",
            },
            {
              model: Repo,
              where: {
                name: sessionData.siteName,
              },
            },
          ],
        }),
        () => new DatabaseError()
      )
        .orElse(() => okAsync(null))
        // NOTE: Even if the site does not exist, we still continue on with the flow.
        // This is because only migrated sites will have a db entry
        // and legacy sites using github login will not.
        // Hence, for such sites, extract their URLs through
        // the _config.yml or github description
        .andThen((site) => {
          if (
            !site ||
            !site.deployment ||
            !site.deployment.stagingUrl ||
            !site.deployment.productionUrl
          ) {
            // Guard clause, this will throw a not found error later on
            return okAsync({
              stagingUrl: undefined,
              productionUrl: undefined,
            })
          }

          if (!sessionData.growthbook) {
            // Not enough info to determine if the feature flag is synced with db
            return okAsync(site.deployment)
          }

          // Privatisation has priority over growthbook - if private, automatically use staging
          const isPrivateSiteSyncedWithDb =
            site.isPrivate && site?.deployment?.stagingUrl.includes("staging.")

          const featureFlagSyncedWithDb =
            !site.isPrivate &&
            ((isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
              site?.deployment?.stagingUrl.includes("staging-lite.")) ||
              // useful for rollbacks
              (!isReduceBuildTimesWhitelistedRepo(sessionData.growthbook) &&
                site?.deployment?.stagingUrl.includes("staging.")))

          if (isPrivateSiteSyncedWithDb || featureFlagSyncedWithDb) {
            return okAsync(site.deployment)
          }

          let stagingUrl: StagingPermalink
          if (site.isPrivate) {
            stagingUrl = Brand.fromString(
              `https://staging.${site.deployment.hostingId}.amplifyapp.com`
            )
          } else if (
            isReduceBuildTimesWhitelistedRepo(sessionData.growthbook)
          ) {
            stagingUrl = Brand.fromString(
              `https://staging-lite.${site.deployment.stagingLiteHostingId}.amplifyapp.com`
            )
          } else {
            stagingUrl = Brand.fromString(
              `https://staging.${site.deployment.hostingId}.amplifyapp.com`
            )
          }
          // Non-blocking control flow
          this.updateDbWithStagingUrl(site, stagingUrl)
          return okAsync({
            ...site.deployment,
            stagingUrl,
          })
        })
        .andThen(({ stagingUrl, productionUrl }) => {
          const siteUrls = {
            staging: stagingUrl,
            prod: productionUrl,
          }

          return this.insertUrlsFromConfigYml(siteUrls, sessionData)
            .map<SiteUrls>((newSiteUrls) => _.assign(siteUrls, newSiteUrls))
            .orElse(() => okAsync(siteUrls))
        })
        .andThen((siteUrls) =>
          this.insertUrlsFromGitHubDescription(
            siteUrls,
            sessionData
          ).map<SiteUrls>((newSiteUrls) => _.assign(siteUrls, newSiteUrls))
        )
        .andThen(({ staging, prod }) => {
          if (!staging && !prod) {
            return errAsync(new MissingSiteError())
          }
          return okAsync({ staging, prod })
        })
    )
  }

  async getSites(sessionData: UserSessionData): Promise<RepositoryData[]> {
    const isEmailUser = sessionData.isEmailUser()
    const { isomerUserId: userId } = sessionData
    const isAdminUser = !!(await this.isomerAdminsService.getByUserId(userId))
    const { accessToken } = sessionData

    // get sites from DB for email login users
    if (!isAdminUser && isEmailUser) {
      const retrievedSitesByEmail = await this.getSitesForEmailUser(userId)
      const filteredValidSites = retrievedSitesByEmail.filter(_.isString)

      const repoData: RepositoryData[] = filteredValidSites.map((site) => ({
        repoName: site,
        lastUpdated: this.sitesCacheService.getLastUpdated(site),
      }))
      return repoData
    }
    // Github users are using their own access token, which already filters sites to only those they have write access to
    // Admin users should have access to all sites regardless

    const repos = await getAllRepoData(accessToken)
    logger.info({
      message: "logging repos retrieved for user",
      meta: {
        userId,
        repos,
      },
    })

    return repos
  }

  async checkHasAccessForGitHubUser(sessionData: UserWithSiteSessionData) {
    await this.gitHubService.checkHasAccess(sessionData)
  }

  getLastUpdated(sessionData: UserWithSiteSessionData): string {
    return this.sitesCacheService.getLastUpdated(sessionData.siteName) || ""
  }

  getStagingUrl(
    sessionData: UserWithSiteSessionData
  ): ResultAsync<StagingPermalink, NotFoundError | MissingSiteError> {
    return this.getUrlsOfSite(sessionData).andThen(({ staging }) =>
      staging ? okAsync(staging) : errAsync(new NotFoundError())
    )
  }

  getSiteUrl(
    sessionData: UserWithSiteSessionData
  ): ResultAsync<ProdPermalink, NotFoundError | MissingSiteError> {
    return this.getUrlsOfSite(sessionData).andThen(({ prod }) =>
      prod ? okAsync(prod) : errAsync(new NotFoundError())
    )
  }

  async create(
    createParams: Partial<Site> & {
      name: Site["name"]
      creator: Site["creator"]
      creatorId: Site["creatorId"]
    }
  ) {
    return this.siteRepository.create(createParams)
  }

  async update(updateParams: Partial<Site> & { id: Site["id"] }) {
    return this.siteRepository.update(updateParams, {
      where: { id: updateParams.id },
    })
  }

  private getLatestCommitOfBranch(
    sessionData: UserWithSiteSessionData,
    branch: "staging" | "master"
  ): ResultAsync<GitHubCommitData, UnprocessableError | NotFoundError> {
    return ResultAsync.fromPromise(
      this.gitHubService.getLatestCommitOfBranch(sessionData, branch),
      () => new NotFoundError()
    ).andThen((possibleCommit: unknown) => {
      if (this.isGitHubCommitData(possibleCommit)) {
        return okAsync(possibleCommit)
      }
      return errAsync(
        new UnprocessableError("Unable to retrieve GitHub commit info")
      )
    })
  }

  getSiteInfo(
    sessionData: UserWithSiteSessionData
  ): ResultAsync<SiteInfo, UnprocessableError> {
    return this.getLatestCommitOfBranch(sessionData, "staging")
      .andThen((staging) =>
        this.getLatestCommitOfBranch(sessionData, "master").map((prod) => ({
          staging,
          prod,
        }))
      )
      .map(({ staging, prod }) => {
        const {
          author: { date: stagingDate },
        } = staging
        const {
          author: { date: prodDate },
        } = prod
        return {
          staging,
          prod,
          savedAt: new Date(stagingDate).getTime() || 0,
          publishedAt: new Date(prodDate).getTime() || 0,
        }
      })
      .andThen(({ staging, ...rest }) =>
        this.getCommitAuthorEmail(staging).map((stagingAuthor) => ({
          savedBy: stagingAuthor || "Unknown Author",
          staging,
          ...rest,
        }))
      )
      .andThen(({ prod, ...rest }) =>
        this.getCommitAuthorEmail(prod).map((prodAuthor) => ({
          publishedBy: prodAuthor || "Unknown Author",
          prod,
          ...rest,
        }))
      )
      .andThen((partialSiteInfo) =>
        this.getUrlsOfSite(sessionData).map((urls) => ({
          stagingUrl: urls.staging || "",
          siteUrl: urls.prod || "",
          ...partialSiteInfo,
        }))
      )
      .map(({ stagingUrl, siteUrl, ...rest }) => ({
        ..._.pick(rest, ["savedAt", "savedBy", "publishedAt", "publishedBy"]),
        siteUrl: Brand.fromString(siteUrl),
        stagingUrl: Brand.fromString(stagingUrl),
      }))
  }

  async getSitesPreview(
    siteNames: string[],
    userSessionData: UserSessionData
  ): Promise<PreviewInfo[]> {
    const { isomerUserId: userId } = userSessionData
    const isAdminUser = !!(await this.isomerAdminsService.getByUserId(userId))

    // As fetching preview images is expensive and incurs high latency,
    // we want to deny the request for admin users who don't require
    // this feature and has hundreds of sites. We also deny requests
    // with more than the limit number of sites as they are most likely
    // admin users.
    const SITES_NUMBER_LIMIT = 50
    if (isAdminUser || siteNames.length > SITES_NUMBER_LIMIT) {
      return []
    }
    return Promise.all(
      siteNames.map(async (siteName) => {
        const urls = await this.getUrlsOfSite(
          new UserWithSiteSessionData({ siteName, ...userSessionData })
        )
        if (urls.isOk() && urls.value.prod) {
          return this.previewService.getPreviewInfo(urls.value.prod)
        }
        return {
          imageUrl: undefined,
        }
      })
    )
  }

  getUserStagingSiteBuildStatus(
    userSessionData: UserWithSiteSessionData
  ): ResultAsync<
    StagingBuildStatus,
    NotFoundError | MissingSiteError | AmplifyError
  > {
    const { siteName, growthbook } = userSessionData
    if (!isShowStagingBuildStatusWhitelistedRepo(growthbook)) {
      return errAsync(new NotFoundError())
    }
    return this.getBySiteName(siteName)
      .andThen((site) =>
        this.deploymentsService.getStagingSiteBuildStatus(
          site.id.toString(),
          isReduceBuildTimesWhitelistedRepo(growthbook)
        )
      )
      .map((status) => ({ status }))
  }
}

export default SitesService
