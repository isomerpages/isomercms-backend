import _ from "lodash"

import {
  ISOMERPAGES_REPO_PAGE_COUNT,
  GH_MAX_REPO_COUNT,
  ISOMER_ADMIN_REPOS,
  GITHUB_ORG_REPOS_ENDPOINT,
} from "@root/constants"
import { genericGitHubAxiosInstance } from "@root/services/api/AxiosInstance"
import type { GitHubRepositoryData, RepositoryData } from "@root/types/repoInfo"

const CACHE_REFRESH_INTERVAL = 60 * 1000 // 1 minutes

export async function getAllRepoData(
  accessToken: string | undefined
): Promise<RepositoryData[]> {
  // Simultaneously retrieve all isomerpages repos
  const paramsArr = _.fill(Array(ISOMERPAGES_REPO_PAGE_COUNT), null).map(
    (__, idx) => ({
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
      } = await genericGitHubAxiosInstance.get(
        GITHUB_ORG_REPOS_ENDPOINT,
        accessToken
          ? {
              headers: { Authorization: `token ${accessToken}` },
              params,
            }
          : { params }
      )
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
        .filter((repoData) => {
          if (!repoData || !repoData.permissions) {
            return false
          }
          return (
            repoData.permissions.push === true &&
            !ISOMER_ADMIN_REPOS.includes(repoData.repoName)
          )
        })
    })
  )
  return _.flatten(allSites)
}

export class RepositoryDataCache {
  private allRepositoryDataCache: RepositoryData[]

  constructor() {
    this.allRepositoryDataCache = []
    this.renewCache()
    setInterval(() => this.renewCache(), CACHE_REFRESH_INTERVAL)
  }

  async renewCache() {
    this.allRepositoryDataCache = await getAllRepoData(undefined)
  }

  getLastUpdated(repoName: string) {
    return this.allRepositoryDataCache.find(
      (repoData) => repoData.repoName === repoName
    )?.lastUpdated
  }
}
