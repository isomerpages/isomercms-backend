const { NotFoundError } = require("@errors/NotFoundError")

const {
  repoInfo,
  repoInfo2,
  adminRepo,
  noAccessRepo,
} = require("@fixtures/repoInfo")
const {
  mockUserWithSiteSessionData,
  mockSessionDataEmailUser,
  mockIsomerUserId,
} = require("@fixtures/sessionData")
const {
  genericGitHubAxiosInstance,
} = require("@root/services/api/AxiosInstance")

describe("Resource Page Service", () => {
  const userId = "userId"

  const mockGithubService = {
    checkHasAccess: jest.fn(),
    getRepoInfo: jest.fn(),
  }

  const mockConfigYmlService = {
    read: jest.fn(),
  }

  const mockUsersService = {
    findSitesByUserId: jest.fn(),
    getRepoInfo: jest.fn(),
  }

  const mockIsomerAdminsService = {
    getByUserId: jest.fn(),
  }

  const { SitesService } = require("@services/utilServices/SitesService")
  const service = new SitesService({
    gitHubService: mockGithubService,
    configYmlService: mockConfigYmlService,
    usersService: mockUsersService,
    isomerAdminsService: mockIsomerAdminsService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getSites", () => {
    it("Filters accessible sites for github user correctly", async () => {
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
      mockIsomerAdminsService.getByUserId.mockImplementationOnce(() => null)
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      }))
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [],
      }))
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [],
      }))

      await expect(
        service.getSites(mockUserWithSiteSessionData)
      ).resolves.toMatchObject(expectedResp)

      expect(genericGitHubAxiosInstance.get).toHaveBeenCalledTimes(3)
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = currRepoCount
      expect(process.env.ISOMERPAGES_REPO_PAGE_COUNT).toBe(currRepoCount)
    })

    it("Filters accessible sites for email user correctly", async () => {
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
      ]
      mockIsomerAdminsService.getByUserId.mockImplementationOnce(() => null)
      mockUsersService.findSitesByUserId.mockImplementationOnce(() => ({
        site_members: [{ repo: { name: repoInfo.name } }],
      }))
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      }))
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [],
      }))
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [],
      }))

      await expect(
        service.getSites(mockSessionDataEmailUser)
      ).resolves.toMatchObject(expectedResp)

      expect(mockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
      expect(genericGitHubAxiosInstance.get).toHaveBeenCalledTimes(3)
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = currRepoCount
      expect(process.env.ISOMERPAGES_REPO_PAGE_COUNT).toBe(currRepoCount)
    })

    it("Filters accessible sites for email user with no sites correctly", async () => {
      // Store the API key and set it later so that other tests are not affected
      const currRepoCount = process.env.ISOMERPAGES_REPO_PAGE_COUNT
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = 3

      const expectedResp = []
      mockIsomerAdminsService.getByUserId.mockImplementationOnce(() => null)
      mockUsersService.findSitesByUserId.mockImplementationOnce(() => null)
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      }))
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [],
      }))
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [],
      }))

      await expect(
        service.getSites(mockSessionDataEmailUser)
      ).resolves.toMatchObject(expectedResp)

      expect(mockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
      expect(mockUsersService.findSitesByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
      expect(genericGitHubAxiosInstance.get).toHaveBeenCalledTimes(3)
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = currRepoCount
      expect(process.env.ISOMERPAGES_REPO_PAGE_COUNT).toBe(currRepoCount)
    })

    it("Returns all accessible sites for admin user correctly", async () => {
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
      mockIsomerAdminsService.getByUserId.mockImplementationOnce(() => "user")
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      }))
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [],
      }))
      genericGitHubAxiosInstance.get.mockImplementationOnce(() => ({
        data: [],
      }))

      await expect(
        service.getSites(mockUserWithSiteSessionData)
      ).resolves.toMatchObject(expectedResp)

      expect(mockIsomerAdminsService.getByUserId).toHaveBeenCalledWith(
        mockIsomerUserId
      )
      expect(genericGitHubAxiosInstance.get).toHaveBeenCalledTimes(3)
      process.env.ISOMERPAGES_REPO_PAGE_COUNT = currRepoCount
      expect(process.env.ISOMERPAGES_REPO_PAGE_COUNT).toBe(currRepoCount)
    })
  })

  describe("checkHasAccess", () => {
    it("Checks if a user has access to a site", async () => {
      await expect(
        service.checkHasAccess(mockUserWithSiteSessionData, { userId })
      ).resolves.not.toThrow()

      expect(mockGithubService.checkHasAccess).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
    })
  })

  describe("getLastUpdated", () => {
    it("Checks when site was last updated", async () => {
      mockGithubService.getRepoInfo.mockResolvedValue(repoInfo)

      await expect(
        service.getLastUpdated(mockUserWithSiteSessionData)
      ).resolves.toEqual(repoInfo.pushed_at)

      expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
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

      await expect(
        service.getStagingUrl(mockUserWithSiteSessionData)
      ).resolves.toEqual(stagingUrl)

      expect(mockConfigYmlService.read).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
    })
    it("Retrieves the staging url for a site from repo info otherwise", async () => {
      mockConfigYmlService.read.mockResolvedValue({
        content: {},
      })
      mockGithubService.getRepoInfo.mockResolvedValue(repoInfo)

      await expect(
        service.getStagingUrl(mockUserWithSiteSessionData)
      ).resolves.toEqual(stagingUrl)

      expect(mockConfigYmlService.read).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
      expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
    })
    it("throws an error when the staging url for a repo is not found", async () => {
      mockConfigYmlService.read.mockResolvedValue({
        content: {},
      })
      mockGithubService.getRepoInfo.mockResolvedValue({
        description: "edited description",
      })

      await expect(
        service.getStagingUrl(mockUserWithSiteSessionData)
      ).rejects.toThrowError(NotFoundError)

      expect(mockConfigYmlService.read).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
      expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(
        mockUserWithSiteSessionData
      )
    })
  })
})
