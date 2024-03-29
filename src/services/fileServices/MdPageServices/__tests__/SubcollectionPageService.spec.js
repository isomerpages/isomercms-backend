const { BadRequestError } = require("@errors/BadRequestError")

const { deslugifyCollectionName } = require("@utils/utils")

describe("Subcollection Page Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const fileName = "test file.md"
  const collectionName = "collection"
  const subcollectionName = "subcollection"
  const directoryName = `_${collectionName}/${subcollectionName}`
  const mockContent = "test"
  const mockMarkdownContent = "---test---"
  const mockFrontMatter = {
    title: "fileTitle",
    permalink: "file/permalink",
  }
  const sha = "12345"

  const sessionData = { siteName, accessToken }
  const collectionYmlObj = {
    collectionName,
    item: `${subcollectionName}/${fileName}`,
  }

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
    SubcollectionPageService,
  } = require("@services/fileServices/MdPageServices/SubcollectionPageService")
  const service = new SubcollectionPageService({
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
    it("rejects page names with special characters", async () => {
      await expect(
        service.create(sessionData, {
          fileName: "file/file.md",
          collectionName,
          subcollectionName,
          content: mockContent,
          frontMatter: { ...mockFrontMatter },
        })
      ).rejects.toThrowError(BadRequestError)
    })
    it("Creating a page with no third nav title in the front matter correctly adds it in", async () => {
      mockGithubService.create.mockResolvedValueOnce({ sha })
      await expect(
        service.create(sessionData, {
          fileName,
          collectionName,
          subcollectionName,
          content: mockContent,
          frontMatter: { ...mockFrontMatter },
        })
      ).resolves.toMatchObject({
        fileName,
        content: { frontMatter: mockFrontMatter, pageBody: mockContent },
        sha,
      })
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        {
          ...mockFrontMatter,
          third_nav_title: deslugifyCollectionName(subcollectionName),
        },
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
    it("Creating a page which specifies a different subcollection in the front matter works correctly", async () => {
      mockGithubService.create.mockResolvedValueOnce({ sha })
      const mockFrontMatterWithSubcollection = {
        ...mockFrontMatter,
        third_nav_title: "mock-third-nav",
      }
      await expect(
        service.create(sessionData, {
          fileName,
          collectionName,
          subcollectionName,
          content: mockContent,
          frontMatter: { ...mockFrontMatterWithSubcollection },
        })
      ).resolves.toMatchObject({
        fileName,
        content: { frontMatter: mockFrontMatter, pageBody: mockContent },
        sha,
      })
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        {
          ...mockFrontMatterWithSubcollection,
          third_nav_title: deslugifyCollectionName(subcollectionName),
        },
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
      mockGithubService.create.mockResolvedValueOnce({ sha })
      const specialName = "test-name.md"
      await expect(
        service.create(sessionData, {
          fileName: specialName,
          collectionName,
          subcollectionName,
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
        {
          ...mockFrontMatter,
          third_nav_title: deslugifyCollectionName(subcollectionName),
        },
        mockContent
      )
      expect(mockCollectionYmlService.addItemToOrder).toHaveBeenCalledWith(
        sessionData,
        {
          ...collectionYmlObj,
          item: `${subcollectionName}/${specialName}`,
        }
      )
      expect(mockGithubService.create).toHaveBeenCalledWith(sessionData, {
        content: mockMarkdownContent,
        fileName: specialName,
        directoryName,
      })
    })
  })

  describe("Read", () => {
    mockGithubService.read.mockResolvedValueOnce({
      content: mockMarkdownContent,
      sha,
    }),
      it("Reading pages works correctly", async () => {
        await expect(
          service.read(sessionData, {
            fileName,
            collectionName,
            subcollectionName,
          })
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
    mockGithubService.update.mockResolvedValueOnce({ newSha: sha })
    it("Updating page content works correctly", async () => {
      await expect(
        service.update(sessionData, {
          fileName,
          collectionName,
          subcollectionName,
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
        service.delete(sessionData, {
          fileName,
          collectionName,
          subcollectionName,
          sha,
        })
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
          item: `${subcollectionName}/${fileName}`,
        }
      )
    })
  })

  describe("Rename", () => {
    const oldSha = "54321"
    const oldFileName = "test-old-file.md"
    mockGithubService.create.mockResolvedValueOnce({ sha })

    it("rejects renaming to page names with special characters", async () => {
      await expect(
        service.rename(sessionData, {
          oldFileName,
          newFileName: "file/file.md",
          collectionName,
          subcollectionName,
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
          subcollectionName,
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
          oldItem: `${subcollectionName}/${oldFileName}`,
          newItem: `${subcollectionName}/${fileName}`,
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

  describe("Update Subcollection", () => {
    const oldSha = "54321"
    const newSubcollectionName = "new-subcollection"
    const newDirectory = `_${collectionName}/${newSubcollectionName}`
    mockGithubService.read.mockResolvedValueOnce({
      content: mockMarkdownContent,
      sha: oldSha,
    })
    mockGithubService.create.mockResolvedValueOnce({ sha })
    mockGithubService.delete.mockResolvedValueOnce({
      content: mockMarkdownContent,
      sha: oldSha,
    })
    it("Updating the subcollection of a page works correctly", async () => {
      await expect(
        service.updateSubcollection(sessionData, {
          fileName,
          collectionName,
          oldSubcollectionName: subcollectionName,
          newSubcollectionName,
        })
      ).resolves.toMatchObject({
        sha,
      })
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        {
          ...mockFrontMatter,
          third_nav_title: deslugifyCollectionName(newSubcollectionName),
        },
        mockContent
      )
      expect(mockGithubService.delete).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
        sha: oldSha,
      })
      expect(mockGithubService.create).toHaveBeenCalledWith(sessionData, {
        content: mockMarkdownContent,
        fileName,
        directoryName: newDirectory,
      })
    })
  })
})
