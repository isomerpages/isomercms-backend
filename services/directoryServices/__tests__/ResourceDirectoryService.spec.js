const { BadRequestError } = require("@errors/BadRequestError")
const { NotFoundError } = require("@errors/NotFoundError")

const INDEX_FILE_NAME = "index.html"

describe("Resource Directory Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const resourceCategoryName = "resource-cat"
  const resourceRoomName = "resource-room"
  const directoryName = `${resourceRoomName}/${resourceCategoryName}`
  const mockContent = ""
  const mockMarkdownContent = "---test---"
  const mockFrontMatter = {
    layout: "resources-alt",
    title: resourceCategoryName,
  }
  const sha = "12345"

  const objArray = [
    {
      type: "file",
      name: "file.md",
    },
    {
      type: "file",
      name: `file2.md`,
    },
  ]

  const reqDetails = { siteName, accessToken }

  const mockBaseDirectoryService = {
    list: jest.fn(),
    rename: jest.fn(),
    delete: jest.fn(),
    moveFiles: jest.fn(),
  }

  const mockGitHubService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
  }

  jest.mock("@utils/markdown-utils", () => ({
    retrieveDataFromMarkdown: jest.fn().mockReturnValue({
      frontMatter: mockFrontMatter,
      pageContent: mockContent,
    }),
    convertDataToMarkdown: jest.fn().mockReturnValue(mockMarkdownContent),
  }))
  const {
    ResourceDirectoryService,
  } = require("@services/directoryServices/ResourceDirectoryService")
  const service = new ResourceDirectoryService({
    baseDirectoryService: mockBaseDirectoryService,
    gitHubService: mockGitHubService,
  })
  const {
    convertDataToMarkdown,
    retrieveDataFromMarkdown,
  } = require("@utils/markdown-utils")

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("ListFiles", () => {
    const listDirResp = [
      {
        name: "index.html",
        path: `${resourceRoomName}/index.html`,
        sha: "test-sha0",
        size: 10,
        type: "file",
      },
      {
        name: resourceCategoryName,
        path: `${resourceRoomName}/${resourceCategoryName}`,
        sha: "test-sha4",
        size: 10,
        type: "dir",
      },
      {
        name: `category-2`,
        path: `${resourceRoomName}/category-2`,
        sha: "test-sha5",
        size: 10,
        type: "dir",
      },
    ]
    const listResp = [
      {
        name: "2021-10-13-file-example-title1.md",
        path: `${directoryName}/_posts/2021-10-13-file-example-title1.md`,
        sha: "test-sha0",
        size: 10,
        type: "file",
      },
      {
        name: "2021-10-06-post-example-title.md",
        path: `${directoryName}/_posts/2021-10-06-post-example-title.md`,
        sha: "test-sha4",
        size: 10,
        type: "file",
      },
      {
        name: "2021-10-06-post-Example Title2.md",
        path: `${directoryName}/_posts/2021-10-06-post-Example Title2.md`,
        sha: "test-sha4",
        size: 10,
        type: "file",
      },
    ]
    const expectedResp = [
      {
        name: "2021-10-13-file-example-title1.md",
        type: "file",
        resourceType: "file",
        title: "Example Title1",
        date: "2021-10-13",
      },
      {
        name: "2021-10-06-post-example-title.md",
        type: "file",
        resourceType: "post",
        title: "Example Title",
        date: "2021-10-06",
      },
      {
        name: "2021-10-06-post-Example Title2.md",
        type: "file",
        resourceType: "post",
        title: "Example Title2",
        date: "2021-10-06",
      },
    ]
    mockBaseDirectoryService.list.mockResolvedValueOnce(listDirResp)
    mockBaseDirectoryService.list.mockResolvedValueOnce(listResp)
    it("ListFiles returns all files in the category", async () => {
      await expect(
        service.listFiles(reqDetails, {
          resourceRoomName,
          resourceCategoryName,
        })
      ).resolves.toMatchObject(expectedResp)
      expect(mockBaseDirectoryService.list).toHaveBeenCalledWith(reqDetails, {
        directoryName: resourceRoomName,
      })
      expect(mockBaseDirectoryService.list).toHaveBeenCalledWith(reqDetails, {
        directoryName: `${directoryName}/_posts`,
      })
    })
    mockBaseDirectoryService.list.mockResolvedValueOnce(listDirResp)
    mockBaseDirectoryService.list.mockRejectedValueOnce(new NotFoundError(""))
    it("ListFiles returns an empty array if resource category contains no files is thrown", async () => {
      await expect(
        service.listFiles(reqDetails, {
          resourceRoomName,
          resourceCategoryName,
        })
      ).resolves.toMatchObject([])
      expect(mockBaseDirectoryService.list).toHaveBeenCalledWith(reqDetails, {
        directoryName: resourceRoomName,
      })
      expect(mockBaseDirectoryService.list).toHaveBeenCalledWith(reqDetails, {
        directoryName: `${directoryName}/_posts`,
      })
    })
    mockBaseDirectoryService.list.mockResolvedValueOnce(listDirResp)
    it("ListFiles returns an error if resource category does not exist", async () => {
      await expect(
        service.listFiles(reqDetails, {
          resourceRoomName,
          resourceCategoryName: "fake-category",
        })
      ).rejects.toThrowError(NotFoundError)
      expect(mockBaseDirectoryService.list).toHaveBeenCalledWith(reqDetails, {
        directoryName: resourceRoomName,
      })
    })
  })

  describe("CreateResourceDirectory", () => {
    it("rejects resource categories with special characters", async () => {
      await expect(
        service.createResourceDirectory(reqDetails, {
          resourceRoomName,
          resourceCategoryName: "dir/dir",
        })
      ).rejects.toThrowError(BadRequestError)
    })

    it("Creating a resource category works correctly", async () => {
      await expect(
        service.createResourceDirectory(reqDetails, {
          resourceRoomName,
          resourceCategoryName,
        })
      ).resolves.toMatchObject({
        newDirectoryName: resourceCategoryName,
      })
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        { ...mockFrontMatter },
        mockContent
      )
      expect(mockGitHubService.create).toHaveBeenCalledWith(reqDetails, {
        content: mockMarkdownContent,
        fileName: INDEX_FILE_NAME,
        directoryName,
      })
    })

    it("Creating a resource category slugifies the name", async () => {
      const originalCategoryName = "Test Category"
      const slugifiedCategoryName = "test-category"
      await expect(
        service.createResourceDirectory(reqDetails, {
          resourceRoomName,
          resourceCategoryName: originalCategoryName,
        })
      ).resolves.toMatchObject({
        newDirectoryName: slugifiedCategoryName,
      })
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        {
          ...mockFrontMatter,
          title: originalCategoryName,
        },
        mockContent
      )
      expect(mockGitHubService.create).toHaveBeenCalledWith(reqDetails, {
        content: mockMarkdownContent,
        fileName: INDEX_FILE_NAME,
        directoryName: `${resourceRoomName}/${slugifiedCategoryName}`,
      })
    })
  })

  describe("RenameResourceDirectory", () => {
    const newDirectoryName = "new-dir"
    it("rejects resource categories with special characters", async () => {
      await expect(
        service.renameResourceDirectory(reqDetails, {
          resourceRoomName,
          resourceCategoryName,
          newDirectoryName: "dir/dir",
        })
      ).rejects.toThrowError(BadRequestError)
    })
    mockGitHubService.read.mockResolvedValueOnce({
      content: mockMarkdownContent,
      sha,
    })
    it("Renaming a resource category works correctly", async () => {
      await expect(
        service.renameResourceDirectory(reqDetails, {
          resourceRoomName,
          resourceCategoryName,
          newDirectoryName,
        })
      ).resolves.not.toThrowError()
      expect(mockGitHubService.read).toHaveBeenCalledWith(reqDetails, {
        fileName: INDEX_FILE_NAME,
        directoryName,
      })
      expect(retrieveDataFromMarkdown).toHaveBeenCalledWith(mockMarkdownContent)
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        {
          ...mockFrontMatter,
          title: newDirectoryName,
        },
        mockContent
      )
      expect(mockBaseDirectoryService.rename).toHaveBeenCalledWith(reqDetails, {
        oldDirectoryName: directoryName,
        newDirectoryName: `${resourceRoomName}/${newDirectoryName}`,
        message: `Renaming resource category ${resourceCategoryName} to ${newDirectoryName}`,
      })
      expect(mockGitHubService.update).toHaveBeenCalledWith(reqDetails, {
        fileContent: mockMarkdownContent,
        sha,
        fileName: INDEX_FILE_NAME,
        directoryName: `${resourceRoomName}/${newDirectoryName}`,
      })
    })
    mockGitHubService.read.mockResolvedValueOnce({
      content: mockMarkdownContent,
      sha,
    })
    it("Renaming a resource category slugifies the name correctly", async () => {
      const originalResourceCategory = "Test Resource"
      const slugifiedResourceCategory = "test-resource"
      await expect(
        service.renameResourceDirectory(reqDetails, {
          resourceRoomName,
          resourceCategoryName,
          newDirectoryName: originalResourceCategory,
        })
      ).resolves.not.toThrowError()
      expect(mockGitHubService.read).toHaveBeenCalledWith(reqDetails, {
        fileName: INDEX_FILE_NAME,
        directoryName,
      })
      expect(retrieveDataFromMarkdown).toHaveBeenCalledWith(mockMarkdownContent)
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        {
          ...mockFrontMatter,
          title: originalResourceCategory,
        },
        mockContent
      )
      expect(mockBaseDirectoryService.rename).toHaveBeenCalledWith(reqDetails, {
        oldDirectoryName: directoryName,
        newDirectoryName: `${resourceRoomName}/${slugifiedResourceCategory}`,
        message: `Renaming resource category ${resourceCategoryName} to ${slugifiedResourceCategory}`,
      })
      expect(mockGitHubService.update).toHaveBeenCalledWith(reqDetails, {
        fileContent: mockMarkdownContent,
        sha,
        fileName: INDEX_FILE_NAME,
        directoryName: `${resourceRoomName}/${slugifiedResourceCategory}`,
      })
    })
  })

  describe("DeleteResourceDirectory", () => {
    it("Deleting a resource category works correctly", async () => {
      await expect(
        service.deleteResourceDirectory(reqDetails, {
          resourceRoomName,
          resourceCategoryName,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.delete).toHaveBeenCalledWith(reqDetails, {
        directoryName,
        message: `Deleting resource category ${resourceCategoryName}`,
      })
    })
  })

  describe("MoveResourcePages", () => {
    const targetResourceCategory = "target-resource"
    const targetFiles = ["file.md", "file2.md"]
    it("Moving resource pages works correctly", async () => {
      await expect(
        service.moveResourcePages(reqDetails, {
          resourceRoomName,
          resourceCategoryName,
          targetResourceCategory,
          objArray,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.moveFiles).toHaveBeenCalledWith(
        reqDetails,
        {
          oldDirectoryName: `${directoryName}/_posts`,
          newDirectoryName: `${resourceRoomName}/${targetResourceCategory}/_posts`,
          targetFiles,
          message: `Moving resource pages from ${resourceCategoryName} to ${targetResourceCategory}`,
        }
      )
    })
  })
})
