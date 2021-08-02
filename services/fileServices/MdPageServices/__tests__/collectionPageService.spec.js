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
    Create: jest.fn(),
    Read: jest.fn(),
    Update: jest.fn(),
    Delete: jest.fn(),
  }

  const mockCollectionYmlService = {
    AddItemToOrder: jest.fn(),
    DeleteItemFromOrder: jest.fn(),
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
    mockGithubService.Create.mockReturnValue({ sha })
    it("Creating pages works correctly", async () => {
      await expect(
        service.Create(reqDetails, {
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
      expect(mockCollectionYmlService.AddItemToOrder).toHaveBeenCalledWith(
        reqDetails,
        collectionYmlObj
      )
      expect(mockGithubService.Create).toHaveBeenCalledWith(reqDetails, {
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
        service.Create(reqDetails, {
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
      expect(mockCollectionYmlService.AddItemToOrder).toHaveBeenCalledWith(
        reqDetails,
        collectionYmlObj
      )
      expect(mockGithubService.Create).toHaveBeenCalledWith(reqDetails, {
        content: mockMarkdownContent,
        fileName,
        directoryName,
      })
    })
  })

  describe("Read", () => {
    mockGithubService.Read.mockReturnValue({
      content: mockMarkdownContent,
      sha,
    }),
      it("Reading pages works correctly", async () => {
        await expect(
          service.Read(reqDetails, { fileName, collectionName })
        ).resolves.toMatchObject({
          fileName,
          content: { frontMatter: mockFrontMatter, pageBody: mockContent },
          sha,
        })
        expect(retrieveDataFromMarkdown).toHaveBeenCalledWith(
          mockMarkdownContent
        )
        expect(mockGithubService.Read).toHaveBeenCalledWith(reqDetails, {
          fileName,
          directoryName,
        })
      })
  })

  describe("Update", () => {
    const oldSha = "54321"
    mockGithubService.Update.mockReturnValue({ newSha: sha })
    it("Updating page content works correctly", async () => {
      await expect(
        service.Update(reqDetails, {
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
      expect(mockGithubService.Update).toHaveBeenCalledWith(reqDetails, {
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
        service.Delete(reqDetails, { fileName, collectionName, sha })
      )
      expect(mockGithubService.Delete).toHaveBeenCalledWith(reqDetails, {
        fileName,
        directoryName,
        sha,
      })
    })
  })

  describe("Rename", () => {
    const oldSha = "54321"
    const oldFileName = "test-old-file"
    mockGithubService.Create.mockReturnValue({ sha })
    it("Renaming pages works correctly", async () => {
      await expect(
        service.Rename(reqDetails, {
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
      expect(mockGithubService.Delete).toHaveBeenCalledWith(reqDetails, {
        fileName: oldFileName,
        directoryName,
        sha: oldSha,
      })
      expect(mockCollectionYmlService.AddItemToOrder).toHaveBeenCalledWith(
        reqDetails,
        collectionYmlObj
      )
      expect(mockGithubService.Create).toHaveBeenCalledWith(reqDetails, {
        content: mockMarkdownContent,
        fileName,
        directoryName,
      })
    })
  })
})
