import _ from "lodash"
import { ModelStatic } from "sequelize"

import { Deployment, Site } from "@database/models"
import type UserSessionData from "@root/classes/UserSessionData"
import type UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import {
  ISOMER_GITHUB_ORG_NAME,
  ISOMERPAGES_REPO_PAGE_COUNT,
  GH_MAX_REPO_COUNT,
  ISOMER_ADMIN_REPOS,
} from "@root/constants"
import { NotFoundError } from "@root/errors/NotFoundError"
import RequestNotFoundError from "@root/errors/RequestNotFoundError"
import { UnprocessableError } from "@root/errors/UnprocessableError"
import { genericGitHubAxiosInstance } from "@root/services/api/AxiosInstance"
import { GitHubCommitData } from "@root/types/commitData"
import { ConfigYmlData } from "@root/types/configYml"
import type { GitHubRepositoryData, RepositoryData } from "@root/types/repoInfo"
import { SiteInfo } from "@root/types/siteInfo"
import { GitHubService } from "@services/db/GitHubService"
import { ConfigYmlService } from "@services/fileServices/YmlFileServices/ConfigYmlService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import UsersService from "@services/identity/UsersService"
import ReviewRequestService from "@services/review/ReviewRequestService"

interface SitesServiceProps {
  siteRepository: ModelStatic<Site>
  gitHubService: GitHubService
  configYmlService: ConfigYmlService
  usersService: UsersService
  isomerAdminsService: IsomerAdminsService
  reviewRequestService: ReviewRequestService
}

type SiteUrlTypes = "staging" | "prod"
type SiteUrls = { [key in SiteUrlTypes]: string }

class SitesService {
  // NOTE: Explicitly specifying using keyed properties to ensure
  // that the types are synced.
  private readonly siteRepository: SitesServiceProps["siteRepository"]

  private readonly gitHubService: SitesServiceProps["gitHubService"]

  private readonly configYmlService: SitesServiceProps["configYmlService"]

  private readonly usersService: SitesServiceProps["usersService"]

  private readonly isomerAdminsService: SitesServiceProps["isomerAdminsService"]

  private readonly reviewRequestService: SitesServiceProps["reviewRequestService"]

  constructor({
    siteRepository,
    gitHubService,
    configYmlService,
    usersService,
    isomerAdminsService,
    reviewRequestService,
  }: SitesServiceProps) {
    this.siteRepository = siteRepository
    this.gitHubService = gitHubService
    this.configYmlService = configYmlService
    this.usersService = usersService
    this.isomerAdminsService = isomerAdminsService
    this.reviewRequestService = reviewRequestService
  }

  isGitHubCommitData(commit: any): commit is GitHubCommitData {
    return (
      commit &&
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

  async insertUrlsFromConfigYml(
    siteUrls: SiteUrls,
    sessionData: UserWithSiteSessionData
  ): Promise<SiteUrls> {
    if (siteUrls.staging && siteUrls.prod) {
      // We call ConfigYmlService only when necessary
      return siteUrls
    }

    const {
      content: configYmlData,
    }: { content: ConfigYmlData } = await this.configYmlService.read(
      sessionData
    )

    // Only replace the urls if they are not already present
    const newSiteUrls: SiteUrls = {
      staging:
        configYmlData.staging && !siteUrls.staging
          ? configYmlData.staging
          : siteUrls.staging,
      prod:
        configYmlData.prod && !siteUrls.prod
          ? configYmlData.prod
          : siteUrls.prod,
    }

    return newSiteUrls
  }

  async insertUrlsFromGitHubDescription(
    siteUrls: SiteUrls,
    sessionData: UserWithSiteSessionData
  ): Promise<SiteUrls> {
    if (siteUrls.staging && siteUrls.prod) {
      // We call GitHubService only when necessary
      return siteUrls
    }

    const {
      description,
    }: { description: string } = await this.gitHubService.getRepoInfo(
      sessionData
    )

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
    const newSiteUrls: SiteUrls = {
      staging:
        stagingUrlFromDesc && !siteUrls.staging
          ? stagingUrlFromDesc
          : siteUrls.staging,
      prod: prodUrlFromDesc && !siteUrls.prod ? prodUrlFromDesc : siteUrls.prod,
    }

    return newSiteUrls
  }

  async getBySiteName(siteName: string): Promise<Site | null> {
    const site = await this.siteRepository.findOne({
      where: { name: siteName },
    })

    return site
  }

  async getSitesForEmailUser(userId: string) {
    const user = await this.usersService.findSitesByUserId(userId)

    if (!user) {
      return []
    }

    return user.site_members.map((site) => site.repo?.name)
  }

  async getCommitAuthorEmail(commit: GitHubCommitData) {
    const { message } = commit

    // Commit message created as part of phase 2 identity
    if (message.startsWith("{") && message.endsWith("}")) {
      try {
        const { userId }: { userId: string } = JSON.parse(message)
        const user = await this.usersService.findById(userId)

        if (user && user.email) {
          return user.email
        }
      } catch (e) {
        // Do nothing
      }
    }

    // Legacy style of commits, or if the user is not found
    return this.extractAuthorEmail(commit)
  }

  async getMergeAuthorEmail(
    commit: GitHubCommitData,
    sessionData: UserWithSiteSessionData
  ) {
    const {
      author: { name: authorName },
    } = commit
    const { siteName } = sessionData

    if (!authorName.startsWith("isomergithub")) {
      // Legacy style of commits, or if the user is not found
      return this.extractAuthorEmail(commit)
    }

    // Commit was made by our common identity GitHub user
    const site = await this.getBySiteName(siteName)
    if (!site) {
      return this.extractAuthorEmail(commit)
    }

    // Retrieve the latest merged review request for the site
    const possibleReviewRequest = await this.reviewRequestService.getLatestMergedReviewRequest(
      site
    )
    if (possibleReviewRequest instanceof RequestNotFoundError) {
      // No review request found, fallback to the commit author email
      return this.extractAuthorEmail(commit)
    }

    // Return the email address of the requestor who made the review request
    const {
      requestor: { email: requestorEmail },
    } = possibleReviewRequest

    if (requestorEmail) {
      return requestorEmail
    }

    // No email address found, fallback to the commit author email
    return this.extractAuthorEmail(commit)
  }

  async getUrlsOfSite(
    sessionData: UserWithSiteSessionData
  ): Promise<SiteUrls | NotFoundError> {
    // Tries to get the site urls in the following order:
    // 1. From the deployments database table
    // 2. From the config.yml file
    // 3. From the GitHub repository description
    // Otherwise, returns a NotFoundError
    const { siteName } = sessionData

    const site = await this.siteRepository.findOne({
      where: { name: siteName },
      include: {
        model: Deployment,
        as: "deployment",
      },
    })

    // Note: site may be null if the site does not exist
    const siteUrls: SiteUrls = {
      staging: site?.deployment?.stagingUrl ?? "",
      prod: site?.deployment?.productionUrl ?? "",
    }

    _.assign(
      siteUrls,
      await this.insertUrlsFromConfigYml(siteUrls, sessionData)
    )
    _.assign(
      siteUrls,
      await this.insertUrlsFromGitHubDescription(siteUrls, sessionData)
    )

    if (!siteUrls.staging && !siteUrls.prod) {
      return new NotFoundError(
        `The site ${siteName} does not have a staging or production url`
      )
    }

    return siteUrls
  }

  async getSites(sessionData: UserSessionData): Promise<RepositoryData[]> {
    const isEmailUser = sessionData.isEmailUser()
    const { isomerUserId: userId } = sessionData
    const isAdminUser = !!(await this.isomerAdminsService.getByUserId(userId))
    const { accessToken } = sessionData
    const endpoint = `https://api.github.com/orgs/${ISOMER_GITHUB_ORG_NAME}/repos`

    // Simultaneously retrieve all isomerpages repos
    const paramsArr = _.fill(Array(ISOMERPAGES_REPO_PAGE_COUNT), null).map(
      (_, idx) => ({
        per_page: GH_MAX_REPO_COUNT,
        sort: "full_name",
        page: idx + 1,
      })
    )

    const allSites = await Promise.all(
      paramsArr.map(async (params) => {
        const {
          data: respData,
        }: {
          data: GitHubRepositoryData[]
        } = await genericGitHubAxiosInstance.get(endpoint, {
          headers: { Authorization: `token ${accessToken}` },
          params,
        })

        return respData
          .map((gitHubRepoData) => {
            const {
              pushed_at: updatedAt,
              permissions,
              name,
              private: isPrivate,
            } = gitHubRepoData

            return {
              lastUpdated: updatedAt,
              permissions,
              repoName: name,
              isPrivate,
            } as RepositoryData
          })
          .filter(
            (repoData) =>
              repoData.permissions.push === true &&
              !ISOMER_ADMIN_REPOS.includes(repoData.repoName)
          )
      })
    )

    const flattenedAllSites = _.flatten(allSites)
    // Github users are using their own access token, which already filters sites to only those they have write access to
    // Admin users should have access to all sites regardless
    if (isAdminUser || !isEmailUser) return flattenedAllSites

    // Email users need to have the list of sites filtered to those they have access to in our db, since our centralised token returns all sites
    const retrievedSitesByEmail = await this.getSitesForEmailUser(userId)

    return flattenedAllSites.filter((repoData) =>
      retrievedSitesByEmail.includes(repoData.repoName)
    )
  }

  async checkHasAccessForGitHubUser(sessionData: UserWithSiteSessionData) {
    await this.gitHubService.checkHasAccess(sessionData)
  }

  async getLastUpdated(sessionData: UserWithSiteSessionData): Promise<string> {
    const { pushed_at: updatedAt } = await this.gitHubService.getRepoInfo(
      sessionData
    )
    return updatedAt
  }

  async getStagingUrl(
    sessionData: UserWithSiteSessionData
  ): Promise<string | NotFoundError> {
    const siteUrls = await this.getUrlsOfSite(sessionData)
    if (siteUrls instanceof NotFoundError) {
      return new NotFoundError(
        `${sessionData.siteName} does not have a staging url`
      )
    }

    const { staging } = siteUrls

    return staging
  }

  async getSiteUrl(
    sessionData: UserWithSiteSessionData
  ): Promise<string | NotFoundError> {
    const siteUrls = await this.getUrlsOfSite(sessionData)
    if (siteUrls instanceof NotFoundError) {
      return new NotFoundError(
        `${sessionData.siteName} does not have a site url`
      )
    }

    const { prod } = siteUrls

    return prod
  }

  async create(
    createParams: Partial<Site> & {
      name: Site["name"]
      apiTokenName: Site["apiTokenName"]
      creator: Site["creator"]
    }
  ) {
    return this.siteRepository.create(createParams)
  }

  async update(updateParams: Partial<Site> & { id: Site["id"] }) {
    return this.siteRepository.update(updateParams, {
      where: { id: updateParams.id },
    })
  }

  async getSiteInfo(
    sessionData: UserWithSiteSessionData
  ): Promise<SiteInfo | UnprocessableError> {
    const siteUrls = await this.getUrlsOfSite(sessionData)
    if (siteUrls instanceof NotFoundError) {
      return new UnprocessableError("Unable to retrieve site info")
    }
    const { staging: stagingUrl, prod: prodUrl } = siteUrls

    const stagingCommit = await this.gitHubService.getLatestCommitOfBranch(
      sessionData,
      "staging"
    )

    const prodCommit = await this.gitHubService.getLatestCommitOfBranch(
      sessionData,
      "master"
    )

    if (
      !this.isGitHubCommitData(stagingCommit) ||
      !this.isGitHubCommitData(prodCommit)
    ) {
      return new UnprocessableError("Unable to retrieve GitHub commit info")
    }

    const {
      author: { date: stagingDate },
    } = stagingCommit
    const {
      author: { date: prodDate },
    } = prodCommit

    const stagingAuthor = await this.getCommitAuthorEmail(stagingCommit)
    const prodAuthor = await this.getMergeAuthorEmail(prodCommit, sessionData)

    return {
      savedAt: new Date(stagingDate).getTime() || 0,
      savedBy: stagingAuthor || "Unknown Author",
      publishedAt: new Date(prodDate).getTime() || 0,
      publishedBy: prodAuthor || "Unknown Author",
      stagingUrl: stagingUrl || "",
      siteUrl: prodUrl || "",
    }
  }
}

export default SitesService
