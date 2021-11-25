const { BadRequestError } = require("@errors/BadRequestError")

describe("Resource Page Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const fileName = "test file.md"
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
    convertDataToMarkdown: jest.fn().mockReturnValue(mockMarkdownContent),
  }))
  const {
    ResourcePageService,
  } = require("@services/fileServices/MdPageServices/ResourcePageService")
  const service = new ResourcePageService({
    gitHubService: mockGithubService,
  })
  const {
    retrieveDataFromMarkdown,
    convertDataToMarkdown,
  } = require("@utils/markdown-utils")

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Create", () => {
    mockGithubService.create.mockResolvedValue({ sha })
    it("rejects page names with special characters", async () => {
      await expect(
        service.create(reqDetails, {
          fileName: "file/file.md",
          resourceRoomName,
          resourceCategoryName,
          content: mockContent,
          frontMatter: { ...mockFrontMatter },
        })
      ).rejects.toThrowError(BadRequestError)
    })
    it("Creating pages works correctly", async () => {
      await expect(
        service.create(reqDetails, {
          fileName,
          resourceRoomName,
          resourceCategoryName,
          content: mockContent,
          frontMatter: { ...mockFrontMatter },
        })
      ).resolves.toMatchObject({
        fileName,
        content: { frontMatter: mockFrontMatter, pageBody: mockContent },
        sha,
      })
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        { ...mockFrontMatter },
        mockContent
      )
      expect(mockGithubService.create).toHaveBeenCalledWith(reqDetails, {
        content: mockMarkdownContent,
        fileName,
        directoryName,
      })
    })
  })

  describe("Read", () => {
    mockGithubService.read.mockResolvedValue({
      content: mockMarkdownContent,
      sha,
    }),
      it("Reading pages works correctly", async () => {
        await expect(
          service.read(reqDetails, {
            fileName,
            resourceRoomName,
            resourceCategoryName,
          })
        ).resolves.toMatchObject({
          fileName,
          content: { frontMatter: mockFrontMatter, pageBody: mockContent },
          sha,
        })
        expect(retrieveDataFromMarkdown).toHaveBeenCalledWith(
          mockMarkdownContent
        )
        expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
          fileName,
          directoryName,
        })
      })
  })

  describe("Update", () => {
    const oldSha = "54321"
    mockGithubService.update.mockResolvedValue({ newSha: sha })
    it("Updating page content works correctly", async () => {
      await expect(
        service.update(reqDetails, {
          fileName,
          resourceRoomName,
          resourceCategoryName,
          content: mockContent,
          frontMatter: mockFrontMatter,
          sha: oldSha,
        })
      ).resolves.toMatchObject({
        fileName,
        content: { frontMatter: mockFrontMatter, pageBody: mockContent },
        oldSha,
        newSha: sha,
      })
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        mockFrontMatter,
        mockContent
      )
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName,
        directoryName,
        fileContent: mockMarkdownContent,
        sha: oldSha,
      })
    })
  })

  describe("Delete", () => {
    it("Deleting pages works correctly", async () => {
      await expect(
        service.delete(reqDetails, {
          fileName,
          resourceRoomName,
          resourceCategoryName,
          sha,
        })
      ).resolves.not.toThrow()
      expect(mockGithubService.delete).toHaveBeenCalledWith(reqDetails, {
        fileName,
        directoryName,
        sha,
      })
    })
  })

  describe("Rename", () => {
    const oldSha = "54321"
    const oldFileName = "test-old-file"
    mockGithubService.create.mockResolvedValue({ sha })
    it("rejects renaming to page names with special characters", async () => {
      await expect(
        service.rename(reqDetails, {
          oldFileName,
          newFileName: "file/file.md",
          resourceRoomName,
          resourceCategoryName,
          content: mockContent,
          frontMatter: { ...mockFrontMatter },
        })
      ).rejects.toThrowError(BadRequestError)
    })
    it("Renaming pages works correctly", async () => {
      await expect(
        service.rename(reqDetails, {
          oldFileName,
          newFileName: fileName,
          resourceRoomName,
          resourceCategoryName,
          content: mockContent,
          frontMatter: mockFrontMatter,
          sha: oldSha,
        })
      ).resolves.toMatchObject({
        fileName,
        content: { frontMatter: mockFrontMatter, pageBody: mockContent },
        oldSha,
        newSha: sha,
      })
      expect(mockGithubService.delete).toHaveBeenCalledWith(reqDetails, {
        fileName: oldFileName,
        directoryName,
        sha: oldSha,
      })
      expect(mockGithubService.create).toHaveBeenCalledWith(reqDetails, {
        content: mockMarkdownContent,
        fileName,
        directoryName,
      })
    })
  })
})
