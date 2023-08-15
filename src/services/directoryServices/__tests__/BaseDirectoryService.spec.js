const { ConflictError } = require("@errors/ConflictError")

describe("Base Directory Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const collectionName = "collection"
  const directoryName = `_${collectionName}`
  const subcollectionName = `subcollection`
  const sha = "12345"
  const message = "message"
  const currentCommitSha = "98765"
  const treeSha = "00000"
  const mockGithubSessionData = "mockData"

  const sessionData = { siteName, accessToken, currentCommitSha, treeSha }

  const mockRepoService = {
    readDirectory: jest.fn(),
    renameSinglePath: jest.fn(),
    moveFiles: jest.fn(),
    getTree: jest.fn(),
    updateTree: jest.fn(),
    updateRepoState: jest.fn(),
    deleteDirectory: jest.fn(),
  }

  const {
    BaseDirectoryService,
  } = require("@services/directoryServices/BaseDirectoryService")
  const service = new BaseDirectoryService({
    repoService: mockRepoService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("List", () => {
    const readDirResp = [
      {
        name: "test-name",
        path: "test-path",
        sha,
        size: 10,
        type: "file",
      },
      {
        name: "test-name2",
        path: "test-path2",
        sha: "test-sha",
        size: 10,
        type: "file",
      },
    ]
    const githubServiceResp = readDirResp.map((item) => ({
      ...item,
      extra: "extra",
    }))
    mockRepoService.readDirectory.mockResolvedValueOnce(githubServiceResp)
    it("Listing directory contents filters and returns only relevant data", async () => {
      await expect(
        service.list(sessionData, {
          directoryName,
        })
      ).resolves.toMatchObject(readDirResp)
      expect(mockRepoService.readDirectory).toHaveBeenCalledWith(sessionData, {
        directoryName,
      })
    })
  })

  describe("Rename", () => {
    const renamedDir = "_renamed-dir"

    it("Renaming a directory to one with an existing name throws an error", async () => {
      mockRepoService.renameSinglePath.mockRejectedValueOnce(
        new ConflictError()
      )

      await expect(
        service.rename(sessionData, mockGithubSessionData, {
          oldDirectoryName: directoryName,
          newDirectoryName: renamedDir,
          message,
        })
      ).rejects.toThrowError(ConflictError)

      expect(mockRepoService.renameSinglePath).toHaveBeenCalledWith(
        sessionData,
        mockGithubSessionData,
        directoryName,
        renamedDir,
        message
      )
    })

    it("Renaming directories works correctly", async () => {
      mockRepoService.renameSinglePath.mockResolvedValueOnce({
        newSha: sha,
      })

      await expect(
        service.rename(sessionData, mockGithubSessionData, {
          oldDirectoryName: directoryName,
          newDirectoryName: renamedDir,
          message,
        })
      ).resolves.not.toThrow()

      expect(mockRepoService.renameSinglePath).toHaveBeenCalledWith(
        sessionData,
        mockGithubSessionData,
        directoryName,
        renamedDir,
        message
      )
    })
  })

  describe("Delete", () => {
    it("Deleting directories works correctly", async () => {
      mockRepoService.deleteDirectory.mockResolvedValueOnce(undefined)

      await expect(
        service.delete(sessionData, mockGithubSessionData, {
          directoryName,
          message,
        })
      ).resolves.not.toThrow()

      expect(mockRepoService.deleteDirectory).toHaveBeenCalledWith(
        sessionData,
        {
          directoryName,
          message,
          githubSessionData: mockGithubSessionData,
        }
      )
    })
  })

  describe("Move Files", () => {
    const targetDir = "_target-dir"

    it("Moving files to a directory which has a file of the same name throws an error", async () => {
      mockRepoService.moveFiles.mockRejectedValueOnce(new ConflictError())

      await expect(
        service.moveFiles(sessionData, mockGithubSessionData, {
          oldDirectoryName: `${directoryName}/${subcollectionName}`,
          newDirectoryName: targetDir,
          targetFiles: ["file.md", "file2.md"],
          message,
        })
      ).rejects.toThrowError(ConflictError)

      expect(mockRepoService.moveFiles).toHaveBeenCalledWith(
        sessionData,
        mockGithubSessionData,
        `${directoryName}/${subcollectionName}`,
        targetDir,
        ["file.md", "file2.md"],
        message
      )
    })

    it("Moving files in directories works correctly", async () => {
      mockRepoService.moveFiles.mockResolvedValueOnce({
        newSha: sha,
      })

      await expect(
        service.moveFiles(sessionData, mockGithubSessionData, {
          oldDirectoryName: `${directoryName}/${subcollectionName}`,
          newDirectoryName: targetDir,
          targetFiles: ["file.md", "file2.md"],
          message,
        })
      ).resolves.not.toThrow()

      expect(mockRepoService.moveFiles).toHaveBeenCalledWith(
        sessionData,
        mockGithubSessionData,
        `${directoryName}/${subcollectionName}`,
        targetDir,
        ["file.md", "file2.md"],
        message
      )
    })
  })
})
