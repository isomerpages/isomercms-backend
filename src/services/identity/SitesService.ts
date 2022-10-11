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
import { genericGitHubAxiosInstance } from "@root/services/api/AxiosInstance"
import { GitHubCommitData } from "@root/types/commitData"
import { ConfigYmlData } from "@root/types/configYml"
import type { GitHubRepositoryData, RepositoryData } from "@root/types/repoInfo"
import { SiteInfo } from "@root/types/siteInfo"
import { GitHubService } from "@services/db/GitHubService"
import { ConfigYmlService } from "@services/fileServices/YmlFileServices/ConfigYmlService"
import IsomerAdminsService from "@services/identity/IsomerAdminsService"
import UsersService from "@services/identity/UsersService"

import TokenStore from "./TokenStore"

interface SitesServiceProps {
  siteRepository: ModelStatic<Site>
  gitHubService: GitHubService
  configYmlService: ConfigYmlService
  usersService: UsersService
  isomerAdminsService: IsomerAdminsService
  tokenStore: TokenStore
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

  private readonly tokenStore: SitesServiceProps["tokenStore"]

  constructor({
    siteRepository,
    gitHubService,
    configYmlService,
    usersService,
    isomerAdminsService,
    tokenStore,
  }: SitesServiceProps) {
    this.siteRepository = siteRepository
    this.gitHubService = gitHubService
    this.configYmlService = configYmlService
    this.usersService = usersService
    this.isomerAdminsService = isomerAdminsService
    this.tokenStore = tokenStore
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

        if (user) {
          return user.email
        }
      } catch (e) {
        // Do nothing
      }
    }

    // Legacy style of commits, or if the user is not found
    const {
      author: { email: authorEmail },
    } = commit
    return authorEmail
  }

  async getUrlsOfSite(
    sessionData: UserWithSiteSessionData,
    urlTypes: SiteUrlTypes[]
  ): Promise<SiteUrls> {
    // Tries to get the site urls in the following order:
    // 1. From the deployments database table
    // 2. From the config.yml file
    // 3. From the GitHub repository description
    // Otherwise, returns an empty string for the url
    const { siteName } = sessionData
    let configYmlData: ConfigYmlData = {}
    let repoDescTokens: string[] = []

    const site = await this.siteRepository.findOne({
      where: { name: siteName },
      include: {
        model: Deployment,
        as: "deployment",
      },
    })

    if (!site) {
      return {
        staging: "",
        prod: "",
      }
    }

    const deployment = site?.deployment
    const output: SiteUrls = {
      staging: deployment?.stagingUrl ? deployment.stagingUrl : "",
      prod: deployment?.productionUrl ? deployment.productionUrl : "",
    }

    for (const urlType of urlTypes) {
      // We only call ConfigYmlService only when necessary
      if (!output[urlType] && Object.keys(configYmlData).length === 0) {
        const {
          content: configData,
        }: { content: ConfigYmlData } = await this.configYmlService.read(
          sessionData
        )

        configYmlData = configData
      }

      if (!output[urlType] && urlType in configYmlData) {
        const configSiteUrl = configYmlData[urlType]

        if (configSiteUrl) {
          output[urlType] = configSiteUrl
        }
      }

      // We only call GitHubService only when necessary
      if (!output[urlType] && repoDescTokens.length == 0) {
        const {
          description,
        }: { description: string } = await this.gitHubService.getRepoInfo(
          sessionData
        )

        // Retrieve the url from the description
        // repo descriptions have varying formats, so we look for the first link
        repoDescTokens = description.replace("/;/g", " ").split(" ")
      }

      if (!output[urlType]) {
        // Site urls also contain the site url types in their url
        const siteUrl = repoDescTokens.find(
          (token) => token.includes("http") && token.includes(urlType)
        )
        if (siteUrl) {
          output[urlType] = siteUrl
        }
      }
    }

    return output
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

  async getStagingUrl(sessionData: UserWithSiteSessionData): Promise<string> {
    const { staging } = await this.getUrlsOfSite(sessionData, ["staging"])
    if (!staging) {
      throw new NotFoundError(
        `${sessionData.siteName} does not have a staging url`
      )
    }
    return staging
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

  async getSiteInfo(sessionData: UserWithSiteSessionData): Promise<SiteInfo> {
    const {
      staging: stagingUrl,
      prod: prodUrl,
    } = await this.getUrlsOfSite(sessionData, ["staging", "prod"])

    const stagingCommit = ((await this.gitHubService.getLatestCommitOfBranch(
      sessionData,
      "staging"
    )) as unknown) as GitHubCommitData
    const prodCommit = ((await this.gitHubService.getLatestCommitOfBranch(
      sessionData,
      "master"
    )) as unknown) as GitHubCommitData

    const {
      author: { date: stagingDate },
    } = stagingCommit
    const {
      author: { date: prodDate },
    } = prodCommit

    const stagingAuthor = await this.getCommitAuthorEmail(stagingCommit)
    const prodAuthor = await this.getCommitAuthorEmail(prodCommit)

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
