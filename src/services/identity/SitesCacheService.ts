import { HeadersDefaults } from "axios"
import _ from "lodash"

import {
  GH_MAX_REPO_COUNT,
  ISOMER_ADMIN_REPOS,
  GITHUB_ORG_REPOS_ENDPOINT,
} from "@root/constants"
import { genericGitHubAxiosInstance } from "@root/services/api/AxiosInstance"
import type { GitHubRepositoryData, RepositoryData } from "@root/types/repoInfo"

// The SitesCacheService is responsible for storing information about
// sites that is not updated live such as lastUpdated and previewImage.
// Changes are polled at fixed intervals, stored in cache, and served
// to avoid long load time from live querying.

const DEFAULT_PAGE_PARAMS = {
  per_page: GH_MAX_REPO_COUNT,
  sort: "full_name",
  page: 1,
}

type GitHubResponseHeaders = HeadersDefaults & {
  link?: string
}

type Link = {
  relid: "first" | "last" | "prev" | "next"
  link: string
  pagenum: number
}

type LinkSet = {
  first?: Link
  last?: Link
  prev?: Link
  next?: Link
}

type LinkMatch = RegExpExecArray & {
  groups: {
    relid: "first" | "last" | "prev" | "next"
    link: string
    pagenum: string
  }
}

type FetchRepoPageResult = {
  repos: RepositoryData[]
  links?: LinkSet
}

function parseGitHubLinkHeader(linkheader: string) {
  // example value: link: <https://api.github.com/organizations/40887764/repos?page=2>; rel="next", <https://api.github.com/organizations/40887764/repos?page=34>; rel="last"
  const links: LinkSet = {}

  const linkRe = /<(?<link>[^>]+\?page=(?<pagenum>\d+))>; rel="(?<relid>[a-z]+)"(, )?/g
  let regRes: LinkMatch | null = null

  // eslint-disable-next-line no-cond-assign
  while ((regRes = linkRe.exec(linkheader) as LinkMatch) !== null) {
    links[regRes.groups.relid] = {
      relid: regRes.groups.relid,
      link: regRes.groups.link,
      pagenum: parseInt(regRes.groups.link, 10),
    }
  }

  return links
}

function getRepositoryData(source: GitHubRepositoryData): RepositoryData {
  const {
    pushed_at: lastUpdated,
    permissions,
    name: repoName,
    private: isPrivate,
  } = source

  return {
    lastUpdated,
    permissions,
    repoName,
    isPrivate,
  }
}

function processAndFilterPageOfRepositories(
  repos: GitHubRepositoryData[]
): RepositoryData[] {
  return repos.map(getRepositoryData).filter((repoData) => {
    if (!repoData || !repoData.permissions) {
      return false
    }
    return (
      repoData.permissions.push === true &&
      !ISOMER_ADMIN_REPOS.includes(repoData.repoName)
    )
  })
}

async function fetchPageOfRepositories({
  accessToken,
  page,
  getLinks,
}: {
  accessToken: string | undefined
  page: number
  getLinks?: boolean
}): Promise<FetchRepoPageResult> {
  const params = { ...DEFAULT_PAGE_PARAMS, page }

  const {
    data,
    headers,
  }: {
    data: GitHubRepositoryData[]
    headers: GitHubResponseHeaders
  } = await genericGitHubAxiosInstance.get(
    GITHUB_ORG_REPOS_ENDPOINT,
    accessToken
      ? {
          headers: { Authorization: `token ${accessToken}` },
          params,
        }
      : { params: DEFAULT_PAGE_PARAMS }
  )

  const res: FetchRepoPageResult = {
    repos: processAndFilterPageOfRepositories(data),
  }

  if (getLinks && headers.link) {
    res.links = parseGitHubLinkHeader(headers.link)
  }

  return res
}

export async function getAllRepoData(
  accessToken: string | undefined
): Promise<RepositoryData[]> {
  const { repos: firstPageRepos, links } = await fetchPageOfRepositories({
    accessToken,
    page: 1,
    getLinks: true,
  })

  if (!links?.last || links.last.pagenum <= 1) {
    // There are no links, or no last link specifically, which is the behaviour when the page returned is the last page
    // (In the same manner has the links for the first page do not prev and first links)
    return firstPageRepos
  }

  // There are more pages to retrieve! Fetch all pages 2 to N in parallel, as was done before
  const pageNums = _.range(2, links.last.pagenum + 1)

  const pages2ToLast = await Promise.all(
    pageNums.map((page) => fetchPageOfRepositories({ accessToken, page }))
  )

  return firstPageRepos.concat(...pages2ToLast.map((res) => res.repos))
}

export class SitesCacheService {
  private repoDataCache: RepositoryData[]

  private refreshInterval: number

  constructor(refreshInterval: number) {
    this.repoDataCache = []
    this.refreshInterval = refreshInterval
    this.renewCache()
    setInterval(() => this.renewCache(), this.refreshInterval)
  }

  private async renewCache() {
    this.repoDataCache = await getAllRepoData(undefined)
  }

  getLastUpdated(repoName: string) {
    return this.repoDataCache.find((siteData) => siteData.repoName === repoName)
      ?.lastUpdated
  }
}
