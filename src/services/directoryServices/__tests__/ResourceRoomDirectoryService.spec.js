import ResourceRoomDirectoryService from "@services/directoryServices/ResourceRoomDirectoryService"

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
  const mockGithubSessionData = "mockData"

  const sessionData = { siteName, accessToken }

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

  describe("ListAllResourceCategories", () => {
    const listResp = [
      {
        name: "index.html",
        path: `${resourceRoomName}/index.html`,
        sha: "test-sha0",
        size: 10,
        type: "file",
      },
      {
        name: "category-1",
        path: `${resourceRoomName}/category-1`,
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
    const expectedResp = [
      {
        name: "category-1",
        type: "dir",
      },
      {
        name: `category-2`,
        type: "dir",
      },
    ]
    mockBaseDirectoryService.list.mockResolvedValueOnce(listResp)
    it("Listing resource categories returns the full list of resource categories", async () => {
      await expect(
        service.listAllResourceCategories(sessionData, { resourceRoomName })
      ).resolves.toMatchObject(expectedResp)
      expect(mockBaseDirectoryService.list).toHaveBeenCalledWith(sessionData, {
        directoryName: resourceRoomName,
      })
    })
  })

  describe("GetResourceRoomDirectoryName", () => {
    mockConfigYmlService.read.mockResolvedValueOnce({
      content: { ...mockConfigContent },
      sha,
    })
    it("Getting the resource room name works correctly", async () => {
      await expect(
        service.getResourceRoomDirectoryName(sessionData)
      ).resolves.toMatchObject({
        resourceRoomName: mockConfigContent.resources_name,
      })
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(sessionData)
    })
  })

  describe("CreateResourceRoomDirectory", () => {
    it("rejects resource room names with special characters", async () => {
      await expect(
        service.createResourceRoomDirectory(sessionData, {
          resourceRoomName: "dir/dir",
        })
      ).rejects.toThrowError(BadRequestError)
    })

    mockConfigYmlService.read.mockResolvedValueOnce({
      content: { ...mockCreateConfigContent },
      sha,
    })
    it("Creating a resource room works correctly", async () => {
      await expect(
        service.createResourceRoomDirectory(sessionData, {
          resourceRoomName,
        })
      ).resolves.toMatchObject({
        newDirectoryName: resourceRoomName,
      })
      expect(convertDataToMarkdown).toHaveBeenCalledWith(
        { ...mockFrontMatter },
        mockContent
      )
      expect(mockGitHubService.create).toHaveBeenCalledWith(sessionData, {
        content: mockMarkdownContent,
        fileName: INDEX_FILE_NAME,
        directoryName,
      })
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(sessionData)
      expect(mockConfigYmlService.update).toHaveBeenCalledWith(sessionData, {
        fileContent: {
          ...mockConfigContent,
          resources_name: resourceRoomName,
        },
        sha,
      })
    })

    mockConfigYmlService.read.mockResolvedValueOnce({
      content: { ...mockCreateConfigContent },
      sha,
    })
    it("Creating a resource room slugifies the name", async () => {
      const originalRoomName = "Test Room"
      const slugifiedRoomName = "test-room"
      await expect(
        service.createResourceRoomDirectory(sessionData, {
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
      expect(mockGitHubService.create).toHaveBeenCalledWith(sessionData, {
        content: mockMarkdownContent,
        fileName: INDEX_FILE_NAME,
        directoryName: slugifiedRoomName,
      })
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(sessionData)
      expect(mockConfigYmlService.update).toHaveBeenCalledWith(sessionData, {
        fileContent: {
          ...mockConfigContent,
          resources_name: slugifiedRoomName,
        },
        sha,
      })
    })

    mockConfigYmlService.read.mockResolvedValueOnce({
      content: { ...mockConfigContent },
      sha,
    })
    it("Creating a resource room throws error if one already exists", async () => {
      await expect(
        service.createResourceRoomDirectory(sessionData, {
          resourceRoomName,
        })
      ).rejects.toThrowError(ConflictError)
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(sessionData)
    })
  })

  describe("RenameResourceRoomDirectory", () => {
    const newDirectoryName = "new-dir"
    const configSha = "23456"
    it("rejects resource room names with special characters", async () => {
      await expect(
        service.renameResourceRoomDirectory(
          sessionData,
          mockGithubSessionData,
          {
            resourceRoomName,
            newDirectoryName: "dir/dir",
          }
        )
      ).rejects.toThrowError(BadRequestError)
    })

    mockGitHubService.read.mockResolvedValueOnce({
      content: mockMarkdownContent,
      sha,
    })
    mockConfigYmlService.read.mockResolvedValueOnce({
      content: { ...mockConfigContent },
      sha: configSha,
    })
    it("Renaming a resource room works correctly", async () => {
      await expect(
        service.renameResourceRoomDirectory(
          sessionData,
          mockGithubSessionData,
          {
            resourceRoomName,
            newDirectoryName,
          }
        )
      ).resolves.not.toThrowError()
      expect(mockGitHubService.read).toHaveBeenCalledWith(sessionData, {
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
      expect(mockGitHubService.update).toHaveBeenCalledWith(sessionData, {
        fileContent: mockMarkdownContent,
        sha,
        fileName: INDEX_FILE_NAME,
        directoryName: newDirectoryName,
      })
      expect(mockBaseDirectoryService.rename).toHaveBeenCalledWith(
        sessionData,
        mockGithubSessionData,
        {
          oldDirectoryName: directoryName,
          newDirectoryName,
          message: `Renaming resource room from ${resourceRoomName} to ${newDirectoryName}`,
        }
      )
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(sessionData)
      expect(mockConfigYmlService.update).toHaveBeenCalledWith(sessionData, {
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
      content: { ...mockConfigContent },
      sha: configSha,
    })
    it("Renaming a resource room slugifies the name correctly", async () => {
      const originalResourceRoom = "Test Resource"
      const slugifiedResourceRoom = "test-resource"
      await expect(
        service.renameResourceRoomDirectory(
          sessionData,
          mockGithubSessionData,
          {
            resourceRoomName,
            newDirectoryName: originalResourceRoom,
          }
        )
      ).resolves.not.toThrowError()
      expect(mockGitHubService.read).toHaveBeenCalledWith(sessionData, {
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
      expect(mockGitHubService.update).toHaveBeenCalledWith(sessionData, {
        fileContent: mockMarkdownContent,
        sha,
        fileName: INDEX_FILE_NAME,
        directoryName: slugifiedResourceRoom,
      })
      expect(mockBaseDirectoryService.rename).toHaveBeenCalledWith(
        sessionData,
        mockGithubSessionData,
        {
          oldDirectoryName: directoryName,
          newDirectoryName: slugifiedResourceRoom,
          message: `Renaming resource room from ${resourceRoomName} to ${slugifiedResourceRoom}`,
        }
      )
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(sessionData)
      expect(mockConfigYmlService.update).toHaveBeenCalledWith(sessionData, {
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
        service.deleteResourceRoomDirectory(
          sessionData,
          mockGithubSessionData,
          {
            resourceRoomName,
          }
        )
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.delete).toHaveBeenCalledWith(
        sessionData,
        mockGithubSessionData,
        {
          directoryName,
          message: `Deleting resource room ${resourceRoomName}`,
        }
      )
      expect(mockConfigYmlService.read).toHaveBeenCalledWith(sessionData)
      const newConfigContent = { ...mockConfigContent }
      delete newConfigContent.resources_name
      expect(mockConfigYmlService.update).toHaveBeenCalledWith(sessionData, {
        fileContent: newConfigContent,
        sha,
      })
    })
  })
})
