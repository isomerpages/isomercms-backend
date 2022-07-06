const { NotFoundError } = require("@errors/NotFoundError")

const {
  repoInfo,
  repoInfo2,
  adminRepo,
  noAccessRepo,
} = require("@fixtures/repoInfo")
const {
  genericGitHubAxiosInstance,
} = require("@root/services/api/AxiosInstance")

describe("Resource Page Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const userId = "userId"

  const reqDetails = { siteName, accessToken }

  const mockGithubService = {
    checkHasAccess: jest.fn(),
    getRepoInfo: jest.fn(),
  }

  const mockConfigYmlService = {
    read: jest.fn(),
  }

  const { SitesService } = require("@services/utilServices/SitesService")
  const service = new SitesService({
    gitHubService: mockGithubService,
    configYmlService: mockConfigYmlService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getSites", () => {
    it("Filters accessible sites correctly", async () => {
      // Store the API key and set it later so that other tests are not affected
      const currRepoCount = process.env.ISOMERPAGES_REPO_PAGE_COUNT
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = 3

      const expectedResp = [
        {
          lastUpdated: repoInfo.pushed_at,
          permissions: repoInfo.permissions,
          repoName: repoInfo.name,
          isPrivate: repoInfo.private,
        },
        {
          lastUpdated: repoInfo2.pushed_at,
          permissions: repoInfo2.permissions,
          repoName: repoInfo2.name,
          isPrivate: repoInfo2.private,
        },
      ]
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      }))
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [],
      }))
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [],
      }))

      await expect(service.getSites({ accessToken })).resolves.toMatchObject(
        expectedResp
      )

      expect(genericGitHubAxiosInstance.get).toHaveBeenCalledTimes(3)
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = currRepoCount
      expect(process.env.ISOMERPAGES_REPO_PAGE_COUNT).toBe(currRepoCount)
    })
  })

  describe("checkHasAccess", () => {
    it("Checks if a user has access to a site", async () => {
      await expect(
        service.checkHasAccess(reqDetails, { userId })
      ).resolves.not.toThrow()

      expect(mockGithubService.checkHasAccess).toHaveBeenCalledWith(
        reqDetails,
        { userId }
      )
    })
  })

  describe("getLastUpdated", () => {
    it("Checks when site was last updated", async () => {
      mockGithubService.getRepoInfo.mockResolvedValue(repoInfo)

      await expect(service.getLastUpdated(reqDetails)).resolves.toEqual(
        repoInfo.pushed_at
      )

      expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(reqDetails)
    })
  })

  describe("getStagingUrl", () => {
    const stagingUrl = "https://repo-staging.netlify.app"
    it("Retrieves the staging url for a site from config if available with higher priority over the description", async () => {
      mockConfigYmlService.read.mockResolvedValue({
        content: {
          staging: stagingUrl,
        },
      })
      mockGithubService.getRepoInfo.mockResolvedValue(repoInfo2)

      await expect(service.getStagingUrl(reqDetails)).resolves.toEqual(
        stagingUrl
      )

      expect(mockConfigYmlService.read).toHaveBeenCalledWith(reqDetails)
    })
    it("Retrieves the staging url for a site from repo info otherwise", async () => {
      mockConfigYmlService.read.mockResolvedValue({
        content: {},
      })
      mockGithubService.getRepoInfo.mockResolvedValue(repoInfo)

      await expect(service.getStagingUrl(reqDetails)).resolves.toEqual(
        stagingUrl
      )

      expect(mockConfigYmlService.read).toHaveBeenCalledWith(reqDetails)
      expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(reqDetails)
    })
    it("throws an error when the staging url for a repo is not found", async () => {
      mockConfigYmlService.read.mockResolvedValue({
        content: {},
      })
      mockGithubService.getRepoInfo.mockResolvedValue({
        description: "edited description",
      })

      await expect(service.getStagingUrl(reqDetails)).rejects.toThrowError(
        NotFoundError
      )

      expect(mockConfigYmlService.read).toHaveBeenCalledWith(reqDetails)
      expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(reqDetails)
    })
  })
})
