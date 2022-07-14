const {
  homepageContent: mockHomepageContent,
  homepageSha: mockHomepageSha,
  rawHomepageContent: mockRawHomepageContent,
} = require("@fixtures/homepage")

describe("Homepage Page Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const reqDetails = { siteName, accessToken }

  const HOMEPAGE_FILE_NAME = "index.md"

  const mockFrontMatter = mockHomepageContent.frontMatter
  const mockContent = mockHomepageContent.pageBody

  const mockGithubService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }

  jest.mock("@utils/markdown-utils", () => ({
    retrieveDataFromMarkdown: jest.fn().mockReturnValue({
      frontMatter: mockFrontMatter,
      pageContent: mockContent,
    }),
    convertDataToMarkdown: jest.fn().mockReturnValue(mockRawHomepageContent),
  }))

  const {
    HomepagePageService,
  } = require("@services/fileServices/MdPageServices/HomepagePageService")
  const service = new HomepagePageService({
    gitHubService: mockGithubService,
  })

  const {
    retrieveDataFromMarkdown,
    convertDataToMarkdown,
  } = require("@utils/markdown-utils")

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Read", () => {
    mockGithubService.read.mockResolvedValue({
      content: mockRawHomepageContent,
      sha: mockHomepageSha,
    })
    it("Reading the homepage works correctly", async () => {
      await expect(service.read(reqDetails)).resolves.toMatchObject({
        content: { frontMatter: mockFrontMatter, pageBody: mockContent },
        sha: mockHomepageSha,
      })
      expect(retrieveDataFromMarkdown).toHaveBeenCalledWith(
        mockRawHomepageContent
      )
      expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
        fileName: HOMEPAGE_FILE_NAME,
      })
    })
  })

  describe("Update", () => {
    const oldSha = "54321"
    mockGithubService.update.mockResolvedValue({ newSha: mockHomepageSha })
    it("Updating page content works correctly", async () => {
      await expect(
        service.update(reqDetails, {
          fileName: HOMEPAGE_FILE_NAME,
          content: mockContent,
          frontMatter: mockFrontMatter,
          sha: oldSha,
        })
      ).resolves.toMatchObject({
        content: { frontMatter: mockFrontMatter, pageBody: mockContent },
        oldSha,
        newSha: mockHomepageSha,
      })
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        mockFrontMatter,
        mockContent
      )
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName: HOMEPAGE_FILE_NAME,
        fileContent: mockRawHomepageContent,
        sha: oldSha,
      })
    })
  })
})
