const { BadRequestError } = require("@errors/BadRequestError")

describe("Collection Page Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const fileName = "test file.md"
  const collectionName = "collection"
  const directoryName = `_${collectionName}`
  const mockContent = "test"
  const mockMarkdownContent = "---test---"
  const mockFrontMatter = {
    title: "fileTitle",
    permalink: "file/permalink",
  }
  const sha = "12345"

  const sessionData = { siteName, accessToken }
  const collectionYmlObj = { collectionName, item: fileName }

  const mockGithubService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }

  const mockCollectionYmlService = {
    addItemToOrder: jest.fn(),
    deleteItemFromOrder: jest.fn(),
    updateItemInOrder: jest.fn(),
  }

  jest.mock("@utils/markdown-utils", () => ({
    retrieveDataFromMarkdown: jest.fn().mockReturnValue({
      frontMatter: mockFrontMatter,
      pageContent: mockContent,
    }),
    convertDataToMarkdown: jest.fn().mockReturnValue(mockMarkdownContent),
  }))
  const {
    CollectionPageService,
  } = require("@services/fileServices/MdPageServices/CollectionPageService")
  const service = new CollectionPageService({
    gitHubService: mockGithubService,
    collectionYmlService: mockCollectionYmlService,
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
          collectionName,
          content: mockContent,
          frontMatter: { ...mockFrontMatter },
        })
      ).rejects.toThrowError(BadRequestError)
    })
    it("Creating pages works correctly", async () => {
      await expect(
        service.create(sessionData, {
          fileName,
          collectionName,
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
      expect(mockCollectionYmlService.addItemToOrder).toHaveBeenCalledWith(
        sessionData,
        collectionYmlObj
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
          collectionName,
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
      expect(mockCollectionYmlService.addItemToOrder).toHaveBeenCalledWith(
        sessionData,
        {
          ...collectionYmlObj,
          item: specialName,
        }
      )
      expect(mockGithubService.create).toHaveBeenCalledWith(sessionData, {
        content: mockMarkdownContent,
        fileName: specialName,
        directoryName,
      })
    })
    it("Creating a page which specifies a third nav in the front matter removes the third_nav_title parameter", async () => {
      const mockFrontMatterWithThirdNav = {
        ...mockFrontMatter,
        third_nav_title: "mock-third-nav",
      }
      await expect(
        service.create(sessionData, {
          fileName,
          collectionName,
          content: mockContent,
          frontMatter: mockFrontMatterWithThirdNav,
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
      expect(mockCollectionYmlService.addItemToOrder).toHaveBeenCalledWith(
        sessionData,
        collectionYmlObj
      )
      expect(mockGithubService.create).toHaveBeenCalledWith(sessionData, {
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
          service.read(sessionData, { fileName, collectionName })
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
          collectionName,
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
        service.delete(sessionData, { fileName, collectionName, sha })
      ).resolves.not.toThrow()
      expect(mockGithubService.delete).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
        sha,
      })
      expect(mockCollectionYmlService.deleteItemFromOrder).toHaveBeenCalledWith(
        sessionData,
        {
          collectionName,
          item: fileName,
        }
      )
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
          collectionName,
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
          collectionName,
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
      expect(mockCollectionYmlService.updateItemInOrder).toHaveBeenCalledWith(
        sessionData,
        {
          collectionName,
          oldItem: oldFileName,
          newItem: fileName,
        }
      )
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
})
