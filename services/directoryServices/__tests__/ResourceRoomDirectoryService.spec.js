const { BadRequestError } = require("@errors/BadRequestError")
const { ConflictError } = require("@errors/ConflictError")

const INDEX_FILE_NAME = "index.html"

describe("Resource Room Directory Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const resourceRoomName = "resource-room"
  const directoryName = resourceRoomName
  const mockContent = ""
  const mockMarkdownContent = "---test---"
  const mockFrontMatter = {
    layout: "resources",
    title: resourceRoomName,
  }
  const mockCreateConfigContent = {
    title: "title",
    url: "",
    favicon: "img.ico",
  }
  const mockConfigContent = {
    title: "title",
    url: "",
    favicon: "img.ico",
    resources_name: "resource",
  }
  const sha = "12345"

  const reqDetails = { siteName, accessToken }

  const mockBaseDirectoryService = {
    list: jest.fn(),
    rename: jest.fn(),
    delete: jest.fn(),
    moveFiles: jest.fn(),
  }

  const mockConfigYmlService = {
    read: jest.fn(),
    update: jest.fn(),
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
    ResourceRoomDirectoryService,
  } = require("@services/directoryServices/ResourceRoomDirectoryService")
  const service = new ResourceRoomDirectoryService({
    baseDirectoryService: mockBaseDirectoryService,
    configYmlService: mockConfigYmlService,
    gitHubService: mockGitHubService,
  })
  const {
    convertDataToMarkdown,
    retrieveDataFromMarkdown,
  } = require("@utils/markdown-utils")

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GetResourceRoomDirectory", () => {
    mockConfigYmlService.read.mockResolvedValueOnce({
      content: mockConfigContent,
      sha,
    })
    it("Getting the resource room name works correctly", async () => {
      await expect(
        service.getResourceRoomDirectory(reqDetails)
      ).resolves.toMatchObject({
        resourceRoomName: mockConfigContent.resources_name,
      })
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(reqDetails)
    })
  })

  describe("CreateResourceRoomDirectory", () => {
    it("rejects resource room names with special characters", async () => {
      await expect(
        service.createResourceRoomDirectory(reqDetails, {
          resourceRoomName: "dir/dir",
        })
      ).rejects.toThrowError(BadRequestError)
    })

    mockConfigYmlService.read.mockResolvedValueOnce({
      content: mockCreateConfigContent,
      sha,
    })
    it("Creating a resource room works correctly", async () => {
      await expect(
        service.createResourceRoomDirectory(reqDetails, {
          resourceRoomName,
        })
      ).resolves.toMatchObject({
        newDirectoryName: resourceRoomName,
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
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(reqDetails)
      expect(mockConfigYmlService.update).toHaveBeenCalledWith(reqDetails, {
        fileContent: {
          ...mockConfigContent,
          resources_name: resourceRoomName,
        },
        sha,
      })
    })

    mockConfigYmlService.read.mockResolvedValueOnce({
      content: mockCreateConfigContent,
      sha,
    })
    it("Creating a resource room slugifies the name", async () => {
      const originalRoomName = "Test Room"
      const slugifiedRoomName = "test-room"
      await expect(
        service.createResourceRoomDirectory(reqDetails, {
          resourceRoomName: originalRoomName,
        })
      ).resolves.toMatchObject({
        newDirectoryName: slugifiedRoomName,
      })
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        {
          ...mockFrontMatter,
          title: originalRoomName,
        },
        mockContent
      )
      expect(mockGitHubService.create).toHaveBeenCalledWith(reqDetails, {
        content: mockMarkdownContent,
        fileName: INDEX_FILE_NAME,
        directoryName: slugifiedRoomName,
      })
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(reqDetails)
      expect(mockConfigYmlService.update).toHaveBeenCalledWith(reqDetails, {
        fileContent: {
          ...mockConfigContent,
          resources_name: slugifiedRoomName,
        },
        sha,
      })
    })

    it("Creating a resource room throws error if one already exists", async () => {
      await expect(
        service.createResourceRoomDirectory(reqDetails, {
          resourceRoomName,
        })
      ).rejects.toThrowError(ConflictError)
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(reqDetails)
    })
  })

  describe("RenameResourceRoomDirectory", () => {
    const newDirectoryName = "new-dir"
    const configSha = "23456"
    it("rejects resource room names with special characters", async () => {
      await expect(
        service.renameResourceRoomDirectory(reqDetails, {
          resourceRoomName,
          newDirectoryName: "dir/dir",
        })
      ).rejects.toThrowError(BadRequestError)
    })

    mockGitHubService.read.mockResolvedValueOnce({
      content: mockMarkdownContent,
      sha,
    })
    mockConfigYmlService.read.mockResolvedValueOnce({
      content: mockConfigContent,
      sha: configSha,
    })
    it("Renaming a resource room works correctly", async () => {
      await expect(
        service.renameResourceRoomDirectory(reqDetails, {
          resourceRoomName,
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
      expect(mockGitHubService.update).toHaveBeenCalledWith(reqDetails, {
        fileContent: mockMarkdownContent,
        sha,
        fileName: INDEX_FILE_NAME,
        directoryName,
      })
      expect(mockBaseDirectoryService.rename).toHaveBeenCalledWith(reqDetails, {
        oldDirectoryName: directoryName,
        newDirectoryName,
        message: `Renaming resource room from ${resourceRoomName} to ${newDirectoryName}`,
      })
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(reqDetails)
      expect(mockConfigYmlService.update).toHaveBeenCalledWith(reqDetails, {
        fileContent: {
          ...mockConfigContent,
          resources_name: newDirectoryName,
        },
        sha: configSha,
      })
    })
    mockGitHubService.read.mockResolvedValueOnce({
      content: mockMarkdownContent,
      sha,
    })
    mockConfigYmlService.read.mockResolvedValueOnce({
      content: mockConfigContent,
      sha: configSha,
    })
    it("Renaming a resource room slugifies the name correctly", async () => {
      const originalResourceRoom = "Test Resource"
      const slugifiedResourceRoom = "test-resource"
      await expect(
        service.renameResourceRoomDirectory(reqDetails, {
          resourceRoomName,
          newDirectoryName: originalResourceRoom,
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
          title: originalResourceRoom,
        },
        mockContent
      )
      expect(mockGitHubService.update).toHaveBeenCalledWith(reqDetails, {
        fileContent: mockMarkdownContent,
        sha,
        fileName: INDEX_FILE_NAME,
        directoryName,
      })
      expect(mockBaseDirectoryService.rename).toHaveBeenCalledWith(reqDetails, {
        oldDirectoryName: directoryName,
        newDirectoryName: slugifiedResourceRoom,
        message: `Renaming resource room from ${resourceRoomName} to ${slugifiedResourceRoom}`,
      })
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(reqDetails)
      expect(mockConfigYmlService.update).toHaveBeenCalledWith(reqDetails, {
        fileContent: {
          ...mockConfigContent,
          resources_name: slugifiedResourceRoom,
        },
        sha: configSha,
      })
    })
  })

  describe("DeleteResourceRoomDirectory", () => {
    mockConfigYmlService.read.mockResolvedValueOnce({
      content: mockConfigContent,
      sha,
    })
    it("Deleting a resource room works correctly", async () => {
      await expect(
        service.deleteResourceRoomDirectory(reqDetails, {
          resourceRoomName,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.delete).toHaveBeenCalledWith(reqDetails, {
        directoryName,
        message: `Deleting resource room ${resourceRoomName}`,
      })
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(reqDetails)
      const newConfigContent = { ...mockConfigContent }
      delete newConfigContent.resources_name
      expect(mockConfigYmlService.update).toHaveBeenCalledWith(reqDetails, {
        fileContent: newConfigContent,
        sha,
      })
    })
  })
})
