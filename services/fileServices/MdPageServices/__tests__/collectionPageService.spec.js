describe("Collection Page Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const fileName = "test-file"
  const collectionName = "collection"
  const directoryName = `_${collectionName}`
  const mockContent = "test"
  const mockMarkdownContent = "---test---"
  const mockFrontMatter = {
    title: "fileTitle",
    permalink: "file/permalink",
  }
  const sha = "12345"

  const reqDetails = { siteName, accessToken }
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
  const { CollectionPageService } = require("../CollectionPageService")
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
    mockGithubService.create.mockReturnValue({ sha })
    it("Creating pages works correctly", async () => {
      await expect(
        service.create(reqDetails, {
          fileName,
          collectionName,
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
      expect(mockCollectionYmlService.addItemToOrder).toHaveBeenCalledWith(
        reqDetails,
        collectionYmlObj
      )
      expect(mockGithubService.create).toHaveBeenCalledWith(reqDetails, {
        content: mockMarkdownContent,
        fileName,
        directoryName,
      })
    })
    it("Creating a page which specifies a third nav in the front matter removes the third_nav_title parameter", async () => {
      const mockFrontMatterWithThirdNav = {
        ...mockFrontMatter,
        third_nav_title: "mock-third-nav",
      }
      await expect(
        service.create(reqDetails, {
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
        mockFrontMatter,
        mockContent
      )
      expect(mockCollectionYmlService.addItemToOrder).toHaveBeenCalledWith(
        reqDetails,
        collectionYmlObj
      )
      expect(mockGithubService.create).toHaveBeenCalledWith(reqDetails, {
        content: mockMarkdownContent,
        fileName,
        directoryName,
      })
    })
  })

  describe("Read", () => {
    mockGithubService.read.mockReturnValue({
      content: mockMarkdownContent,
      sha,
    }),
      it("Reading pages works correctly", async () => {
        await expect(
          service.read(reqDetails, { fileName, collectionName })
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
    mockGithubService.update.mockReturnValue({ newSha: sha })
    it("Updating page content works correctly", async () => {
      await expect(
        service.update(reqDetails, {
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
        service.delete(reqDetails, { fileName, collectionName, sha })
      )
      expect(mockGithubService.delete).toHaveBeenCalledWith(reqDetails, {
        fileName,
        directoryName,
        sha,
      })
      expect(mockCollectionYmlService.deleteItemFromOrder).toHaveBeenCalledWith(
        reqDetails,
        {
          collectionName,
          item: fileName,
        }
      )
    })
  })

  describe("Rename", () => {
    const oldSha = "54321"
    const oldFileName = "test-old-file"
    mockGithubService.create.mockReturnValue({ sha })
    it("Renaming pages works correctly", async () => {
      await expect(
        service.rename(reqDetails, {
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
        reqDetails,
        {
          collectionName,
          oldItem: oldFileName,
          newItem: fileName,
        }
      )
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
