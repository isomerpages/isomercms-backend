const axios = require("axios")

const { BadRequestError } = require("@errors/BadRequestError")

jest.mock("axios")

const {
  repoInfo,
  repoInfo2,
  adminRepo,
  noAccessRepo,
} = require("@fixtures/repoInfo")

describe("Resource Page Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const userId = "userId"
  const resourceRoomName = "resource-room"
  const resourceCategoryName = "category"
  const directoryName = `${resourceRoomName}/${resourceCategoryName}/_posts`
  const mockContent = "test"
  const mockMarkdownContent = "---test---"
  const mockFrontMatter = {
    title: "fileTitle",
    permalink: "file/permalink",
  }
  const sha = "12345"

  const reqDetails = { siteName, accessToken }

  const gapInUpdate =
    new Date().getTime() - new Date(repoInfo.updated_at).getTime()
  const numDaysAgo = Math.floor(gapInUpdate / (1000 * 60 * 60 * 24))

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
      const expectedResp = [
        {
          lastUpdated: `Updated ${numDaysAgo} days ago`,
          permissions: repoInfo.permissions,
          repoName: repoInfo.name,
          isPrivate: repoInfo.private,
        },
        {
          lastUpdated: `Updated ${numDaysAgo} days ago`,
          permissions: repoInfo2.permissions,
          repoName: repoInfo2.name,
          isPrivate: repoInfo2.private,
        },
      ]
      axios.get.mockImplementationOnce(() => ({
        data: [repoInfo, repoInfo2, adminRepo, noAccessRepo],
      }))
      axios.get.mockImplementationOnce(() => ({
        data: [],
      }))
      axios.get.mockImplementationOnce(() => ({
        data: [],
      }))
      await expect(service.getSites({ accessToken })).resolves.toMatchObject(
        expectedResp
      )
      expect(axios.get).toHaveBeenCalledTimes(3)
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
        `Updated ${numDaysAgo} days ago`
      )
      expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(reqDetails)
    })
  })

  describe("getStagingUrl", () => {
    const stagingUrl = "https://repo-staging.netlify.app"
    it("Retrieves the staging url for a site from config if available", async () => {
      mockConfigYmlService.read.mockResolvedValue({
        content: {
          staging: stagingUrl,
        },
      })
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
  })
})
