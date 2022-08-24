const Bluebird = require("bluebird")
const _ = require("lodash")

const { NotFoundError } = require("@root/errors/NotFoundError")
const {
  genericGitHubAxiosInstance,
} = require("@root/services/api/AxiosInstance")

const GH_MAX_REPO_COUNT = 100
const ISOMERPAGES_REPO_PAGE_COUNT =
  parseInt(process.env.ISOMERPAGES_REPO_PAGE_COUNT) || 3
const ISOMER_GITHUB_ORG_NAME = process.env.GITHUB_ORG_NAME
const ISOMER_ADMIN_REPOS = [
  "isomercms-backend",
  "isomercms-frontend",
  "isomer-redirection",
  "isomerpages-template",
  "isomer-conversion-scripts",
  "isomer-wysiwyg",
  "isomer-slackbot",
  "isomer-tooling",
  "generate-site",
  "travisci-scripts",
  "recommender-train",
  "editor",
  "ci-test",
  "infra",
  "markdown-helper",
]

class SitesService {
  constructor({
    gitHubService,
    configYmlService,
    usersService,
    isomerAdminsService,
  }) {
    this.githubService = gitHubService
    this.configYmlService = configYmlService
    this.usersService = usersService
    this.isomerAdminsService = isomerAdminsService
  }

  async getEmailUserSites(userId) {
    const user = await this.usersService.findSitesByUserId(userId)
    if (!user) return []
    const { site_members: siteMemberEntries } = user
    return siteMemberEntries.map((entry) => {
      const repoData = entry.repo
      return repoData.name
    })
  }

  async getSites(sessionData) {
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

    const allSites = await Bluebird.map(paramsArr, async (params) => {
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
        .map((repoData) => {
          const {
            pushed_at: updatedAt,
            permissions,
            name,
            private: isPrivate,
          } = repoData

          return {
            lastUpdated: updatedAt,
            permissions,
            repoName: name,
            isPrivate,
          }
        })
        .filter(
          (repoData) =>
            repoData.permissions.push === true &&
            !ISOMER_ADMIN_REPOS.includes(repoData.repoName)
        )
    })

    const flattenedAllSites = _.flatten(allSites)
    // Github users are using their own access token, which already filters sites to only those they have write access to
    if (isAdminUser || !isEmailUser) return flattenedAllSites

    // Email users need to have the list of sites filtered to those they have access to in our db, since our centralised token returns all sites
    const retrievedSitesByEmail = await this.getEmailUserSites(userId)

    return flattenedAllSites.filter((repoData) =>
      retrievedSitesByEmail.includes(repoData.repoName)
    )
  }

  async checkHasAccess(sessionData) {
    await this.githubService.checkHasAccess(sessionData)
  }

  async getLastUpdated(sessionData) {
    const { pushed_at: updatedAt } = await this.githubService.getRepoInfo(
      sessionData
    )
    return updatedAt
  }

  async getStagingUrl(sessionData) {
    // Check config.yml for staging url if it exists, and github site description otherwise
    const { content: configData } = await this.configYmlService.read(
      sessionData
    )
    if ("staging" in configData) return configData.staging

    const { description } = await this.githubService.getRepoInfo(sessionData)

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
}

module.exports = {
  SitesService,
}
