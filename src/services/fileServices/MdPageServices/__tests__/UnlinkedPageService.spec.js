const { BadRequestError } = require("@errors/BadRequestError")

describe("Unlinked Page Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const fileName = "test file.md"
  const directoryName = "pages"
  const mockContent = "test"
  const mockMarkdownContent = "---test---"
  const mockFrontMatter = {
    title: "fileTitle",
    permalink: "file/permalink",
  }
  const sha = "12345"

  const sessionData = { siteName, accessToken }

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
    UnlinkedPageService,
  } = require("@services/fileServices/MdPageServices/UnlinkedPageService")
  const service = new UnlinkedPageService({
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
        service.create(sessionData, {
          fileName: "file/file.md",
          content: mockContent,
          frontMatter: { ...mockFrontMatter },
        })
      ).rejects.toThrowError(BadRequestError)
    })
    it("Creating pages works correctly", async () => {
      await expect(
        service.create(sessionData, {
          fileName,
          content: mockContent,
          frontMatter: mockFrontMatter,
        })
      ).resolves.toMatchObject({
        fileName,
        content: { frontMatter: mockFrontMatter, pageBody: mockContent },
        sha,
      })
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        mockFrontMatter,
        mockContent
      )
      expect(mockGithubService.create).toHaveBeenCalledWith(sessionData, {
        content: mockMarkdownContent,
        fileName,
        directoryName,
      })
    })

    it("Creating pages skips the check for special characters if specified", async () => {
      const specialName = "test-name.md"
      await expect(
        service.create(sessionData, {
          fileName: specialName,
          content: mockContent,
          frontMatter: { ...mockFrontMatter },
          shouldIgnoreCheck: true,
        })
      ).resolves.toMatchObject({
        fileName: specialName,
        content: { frontMatter: mockFrontMatter, pageBody: mockContent },
        sha,
      })
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        { ...mockFrontMatter },
        mockContent
      )
      expect(mockGithubService.create).toHaveBeenCalledWith(sessionData, {
        content: mockMarkdownContent,
        fileName: specialName,
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
          service.read(sessionData, { fileName })
        ).resolves.toMatchObject({
          fileName,
          content: { frontMatter: mockFrontMatter, pageBody: mockContent },
          sha,
        })
        expect(retrieveDataFromMarkdown).toHaveBeenCalledWith(
          mockMarkdownContent
        )
        expect(mockGithubService.read).toHaveBeenCalledWith(sessionData, {
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
        service.update(sessionData, {
          fileName,
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
      expect(mockGithubService.update).toHaveBeenCalledWith(sessionData, {
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
        service.delete(sessionData, { fileName, sha })
      ).resolves.not.toThrow()
      expect(mockGithubService.delete).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
        sha,
      })
    })
  })

  describe("Rename", () => {
    const oldSha = "54321"
    const oldFileName = "test-old-file.md"
    mockGithubService.create.mockResolvedValue({ sha })
    it("rejects renaming to page names with special characters", async () => {
      await expect(
        service.rename(sessionData, {
          oldFileName,
          newFileName: "file/file.md",
          content: mockContent,
          frontMatter: { ...mockFrontMatter },
        })
      ).rejects.toThrowError(BadRequestError)
    })
    it("Renaming pages works correctly", async () => {
      await expect(
        service.rename(sessionData, {
          oldFileName,
          newFileName: fileName,
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
      expect(mockGithubService.delete).toHaveBeenCalledWith(sessionData, {
        fileName: oldFileName,
        directoryName,
        sha: oldSha,
      })
      expect(mockGithubService.create).toHaveBeenCalledWith(sessionData, {
        content: mockMarkdownContent,
        fileName,
        directoryName,
      })
    })
  })

  // TO-DO: Add tests for the list method
})
