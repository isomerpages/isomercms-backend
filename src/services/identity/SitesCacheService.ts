import { HeadersDefaults } from "axios"
import _ from "lodash"

import tracer from "@utils/tracer"

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

type LinkRelation = "first" | "last" | "prev" | "next"

type Link = {
  relid: LinkRelation
  url: string
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
    relid: LinkRelation
    url: string
  }
}

type FetchRepoPageResult = {
  repos: RepositoryData[]
  links?: LinkSet
}

type CacheStore = {
  [key: string]: RepositoryData
}

function parseGitHubLinkHeader(linkheader: string): LinkSet {
  // example value: link: <https://api.github.com/organizations/40887764/repos?page=2>; rel="next", <https://api.github.com/organizations/40887764/repos?page=34>; rel="last"
  const links: LinkSet = {}

  const linkRe = /<(?<url>[^>]+)>; rel="(?<relid>[a-z]+)"(, )?/g
  let regRes: LinkMatch | null = null

  // eslint-disable-next-line no-cond-assign
  while ((regRes = linkRe.exec(linkheader) as LinkMatch) !== null) {
    const url = new URL(regRes.groups.url)
    const pageNum = url.searchParams.get("page") as string // Per specifications, we KNOW the github link urls WILL include a page number in the url
    links[regRes.groups.relid] = {
      relid: regRes.groups.relid,
      url: regRes.groups.url,
      pagenum: parseInt(pageNum, 10),
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
  accessToken?: string
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
      : { params }
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

async function getAllRepoDataSequentially() {
  // This function exists because when we refresh the cache on interval, we want to optimize for load
  // distribution in the process over time, rather than optimize for time to refresh

  const allRepos = []
  let page = 1

  // We disable the eslint rule no-await-in-loop, because we specifically want sequence here to distribute load
  /* eslint-disable no-await-in-loop */
  do {
    const { repos, links } = await fetchPageOfRepositories({
      page,
      getLinks: true,
    })

    allRepos.push(...repos)

    if (!links?.next) {
      break
    }

    page = links.next.pagenum // Note that by right, we should follow the next link, rather than extract the page number from the link
  } while (true) // eslint-disable-line no-constant-condition
  /* eslint-enable no-await-in-loop */

  return allRepos
}

export class SitesCacheService {
  private repoDataCache: CacheStore

  private refreshInterval: number

  constructor(refreshInterval: number) {
    this.repoDataCache = {} as CacheStore
    this.refreshInterval = refreshInterval

    this.startCache()

    setInterval(() => this.renewCache(), this.refreshInterval)
  }

  private transformRepoList(repos: RepositoryData[]) {
    // Since the only cache API we expose is to retrieve repo info by repo name, we store the repos as a map in cache
    // to have a O(1) retrieval later
    return repos.reduce((acc, repo) => {
      acc[repo.repoName] = repo
      return acc
    }, {} as CacheStore)
  }

  private async startCache() {
    const repos = await getAllRepoData(undefined)
    this.repoDataCache = this.transformRepoList(repos)
  }

  private async renewCache() {
    tracer.trace("SiteCache.renewCache", async () => {
      const repos = await getAllRepoDataSequentially()
      this.repoDataCache = this.transformRepoList(repos)
    })
  }

  getLastUpdated(repoName: string) {
    return this.repoDataCache[repoName]?.lastUpdated
  }
}
