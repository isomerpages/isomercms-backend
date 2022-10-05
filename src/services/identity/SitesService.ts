import Bluebird from "bluebird"
import _ from "lodash"
import { ModelStatic } from "sequelize"

import { Site, SiteMember, User } from "@database/models"
import UserSessionData from "@root/classes/UserSessionData"
import {
  ISOMER_GITHUB_ORG_NAME,
  ISOMERPAGES_REPO_PAGE_COUNT,
  GH_MAX_REPO_COUNT,
  ISOMER_ADMIN_REPOS,
} from "@root/constants"
import { NotFoundError } from "@root/errors/NotFoundError"
import { genericGitHubAxiosInstance } from "@root/services/api/AxiosInstance"
import type { GitHubRepositoryData, RepositoryData } from "@root/types/repoInfo"
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

    const allSites: RepositoryData[] = await Bluebird.map(
      paramsArr,
      async (params) => {
        const { data: respData } = await genericGitHubAxiosInstance.get(
          endpoint,
          {
            params,
            headers: {
              Authorization: `token ${accessToken}`,
            },
          }
        )

        return respData
          .map((gitHubRepoData: GitHubRepositoryData) => {
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
            }
          })
          .filter(
            (repoData: RepositoryData) =>
              repoData.permissions.push === true &&
              !ISOMER_ADMIN_REPOS.includes(repoData.repoName)
          )
      }
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

  async checkHasAccessForGitHubUser(sessionData: UserSessionData) {
    await this.gitHubService.checkHasAccess(sessionData)
  }

  async getLastUpdated(siteName: string): Promise<string> {
    const sessionData = {
      siteName,
      accessToken: await this.getSiteAccessToken(siteName),
    }
    const { pushed_at: updatedAt } = await this.gitHubService.getRepoInfo(
      sessionData
    )
    return updatedAt
  }

  async getStagingUrl(siteName: string): Promise<string> {
    const sessionData = {
      siteName,
      accessToken: await this.getSiteAccessToken(siteName),
    }
    // Check config.yml for staging url if it exists, and github site description otherwise
    const { content: configData } = await this.configYmlService.read(
      sessionData
    )
    if ("staging" in configData) return configData.staging

    const {
      description,
    }: { description: string } = await this.gitHubService.getRepoInfo(
      sessionData
    )

    if (description) {
      // Retrieve the url from the description - repo descriptions have varying formats, so we look for the first link
      const descTokens = description.replace("/;/g", " ").split(" ")
      // Staging urls also contain staging in their url
      const stagingUrl = descTokens.find(
        (token) => token.includes("http") && token.includes("staging")
      )
      if (stagingUrl) return stagingUrl
    }

    throw new NotFoundError(`${sessionData.siteName} has no staging url`)
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

  async getSiteAccessToken(siteName: string) {
    const site = await this.getBySiteName(siteName)

    if (!site) {
      return null
    }

    const token = await this.tokenStore.getToken(site.apiTokenName)
    return token
  }
}

export default SitesService
