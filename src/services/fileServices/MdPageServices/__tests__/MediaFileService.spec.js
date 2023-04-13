const { config } = require("@config/config")

const { BadRequestError } = require("@errors/BadRequestError")

const GITHUB_ORG_NAME = config.get("github.orgName")

describe("Media File Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const imageName = "test image.png"
  const fileName = "test file.pdf"
  const directoryName = "images/subfolder"
  const mockContent = "schema, test"
  const mockSanitizedContent = "sanitized-test"
  const sha = "12345"
  const mockGithubSessionData = "githubData"

  const sessionData = { siteName, accessToken }

  const mockGithubService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getRepoInfo: jest.fn(),
    readMedia: jest.fn(),
    readDirectory: jest.fn(),
    getTree: jest.fn(),
    updateTree: jest.fn(),
    updateRepoState: jest.fn(),
  }

  jest.mock("@utils/file-upload-utils", () => ({
    validateAndSanitizeFileUpload: jest
      .fn()
      .mockReturnValue(mockSanitizedContent),
    ALLOWED_FILE_EXTENSIONS: ["pdf"],
    scanFileForVirus: jest.fn().mockReturnValue({ CleanResult: true }),
  }))

  const {
    MediaFileService,
  } = require("@services/fileServices/MdPageServices/MediaFileService")

  const service = new MediaFileService({
    gitHubService: mockGithubService,
  })
  const { validateAndSanitizeFileUpload } = require("@utils/file-upload-utils")

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Create", () => {
    it("rejects page names with special characters", async () => {
      await expect(
        service.create(sessionData, {
          fileName: "file/file.pdf",
          directoryName,
          content: mockContent,
        })
      ).rejects.toThrowError(BadRequestError)
    })

    mockGithubService.create.mockResolvedValueOnce({ sha })
    it("Creating pages works correctly", async () => {
      await expect(
        service.create(sessionData, {
          fileName,
          directoryName,
          content: mockContent,
        })
      ).resolves.toMatchObject({
        name: fileName,
        content: mockContent,
        sha,
      })
      expect(mockGithubService.create).toHaveBeenCalledWith(sessionData, {
        content: mockSanitizedContent,
        fileName,
        directoryName,
        isMedia: true,
      })
      expect(validateAndSanitizeFileUpload).toHaveBeenCalledWith(mockContent)
    })
  })

  describe("Read", () => {
    // TODO: file tests when file handling is implemented
    const imageDirResp = [
      {
        name: imageName,
        sha,
      },
      {
        name: "image2.png",
        sha: "image2sha",
      },
    ]
    const fileDirResp = [
      {
        name: fileName,
        sha,
      },
      {
        name: "file2.pdf",
        sha: "file2sha",
      },
    ]
    mockGithubService.readDirectory.mockResolvedValueOnce(imageDirResp)
    mockGithubService.getRepoInfo.mockResolvedValueOnce({
      private: false,
    })
    mockGithubService.readMedia.mockResolvedValueOnce({
      content: mockContent,
    })
    it("Reading image files in public repos works correctly", async () => {
      const expectedResp = {
        mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${directoryName}/${imageName}`,
        name: imageName,
        sha,
      }
      await expect(
        service.read(sessionData, {
          fileName: imageName,
          directoryName,
        })
      ).resolves.toMatchObject(expectedResp)
      expect(mockGithubService.readDirectory).toHaveBeenCalledWith(
        sessionData,
        {
          directoryName,
        }
      )
      expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(sessionData)
    })
    const svgName = "image.svg"
    mockGithubService.readDirectory.mockResolvedValueOnce([
      ...imageDirResp,
      {
        sha,
        name: svgName,
      },
    ])
    mockGithubService.getRepoInfo.mockResolvedValueOnce({
      private: false,
    })
    it("Reading svg files in public repos adds sanitisation", async () => {
      const expectedResp = {
        mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${directoryName}/${svgName}?sanitize=true`,
        name: svgName,
        sha,
      }
      await expect(
        service.read(sessionData, {
          fileName: svgName,
          directoryName,
          mediaType: "images",
        })
      ).resolves.toMatchObject(expectedResp)
      expect(mockGithubService.readDirectory).toHaveBeenCalledWith(
        sessionData,
        {
          directoryName,
        }
      )
      expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(sessionData)
    })
    mockGithubService.readDirectory.mockResolvedValueOnce(imageDirResp)
    mockGithubService.getRepoInfo.mockResolvedValueOnce({
      private: true,
    })
    it("Reading image files in private repos works correctly", async () => {
      const expectedResp = {
        mediaUrl: `data:image/png;base64,${mockContent}`,
        name: imageName,
        sha,
      }
      await expect(
        service.read(sessionData, {
          fileName: imageName,
          directoryName,
          mediaType: "images",
        })
      ).resolves.toMatchObject(expectedResp)
      expect(mockGithubService.readDirectory).toHaveBeenCalledWith(
        sessionData,
        {
          directoryName,
        }
      )
      expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(sessionData)
      expect(mockGithubService.readMedia).toHaveBeenCalledWith(sessionData, {
        fileSha: sha,
      })
    })
    mockGithubService.readDirectory.mockResolvedValueOnce(fileDirResp)
    mockGithubService.getRepoInfo.mockResolvedValueOnce({
      private: false,
    })
    mockGithubService.readMedia.mockResolvedValueOnce({
      content: mockContent,
    })
    it("Reading files in public repos works correctly", async () => {
      const expectedResp = {
        mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${directoryName}/${fileName}`,
        name: fileName,
        sha,
      }
      await expect(
        service.read(sessionData, {
          fileName,
          directoryName,
          mediaType: "files",
        })
      ).resolves.toMatchObject(expectedResp)
      expect(mockGithubService.readDirectory).toHaveBeenCalledWith(
        sessionData,
        {
          directoryName,
        }
      )
      expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(sessionData)
    })
  })

  describe("Update", () => {
    const oldSha = "54321"
    mockGithubService.create.mockResolvedValueOnce({ sha })
    it("Updating media file content works correctly", async () => {
      await expect(
        service.update(sessionData, {
          fileName,
          directoryName,
          content: mockContent,
          sha: oldSha,
        })
      ).resolves.toMatchObject({
        name: fileName,
        content: mockContent,
        oldSha,
        newSha: sha,
      })
      expect(mockGithubService.delete).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
        sha: oldSha,
      })
      expect(mockGithubService.create).toHaveBeenCalledWith(sessionData, {
        content: mockSanitizedContent,
        fileName,
        directoryName,
        isMedia: true,
      })
      expect(validateAndSanitizeFileUpload).toHaveBeenCalledWith(mockContent)
    })
  })

  describe("Delete", () => {
    it("Deleting pages works correctly", async () => {
      await expect(
        service.delete(sessionData, { fileName, directoryName, sha })
      ).resolves.not.toThrow()
      expect(mockGithubService.delete).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
        sha,
      })
    })
  })

  describe("Rename", () => {
    const oldFileName = "test old file.pdf"
    const treeSha = "treesha"
    const mockedTree = [
      {
        type: "file",
        path: `${directoryName}/${oldFileName}`,
        sha,
      },
      {
        type: "file",
        path: `${directoryName}/file.md`,
        sha: "sha1",
      },
    ]
    const mockedMovedTree = [
      {
        type: "file",
        path: `${directoryName}/${oldFileName}`,
        sha: null,
      },
      {
        type: "file",
        path: `${directoryName}/${fileName}`,
        sha,
      },
    ]
    mockGithubService.getTree.mockResolvedValueOnce(mockedTree)
    mockGithubService.updateTree.mockResolvedValueOnce(treeSha)

    it("rejects renaming to page names with special characters", async () => {
      await expect(
        service.rename(sessionData, mockGithubSessionData, {
          oldFileName,
          newFileName: "file/file.pdf",
          directoryName,
          content: mockContent,
        })
      ).rejects.toThrowError(BadRequestError)
    })
    it("Renaming pages works correctly", async () => {
      await expect(
        service.rename(sessionData, mockGithubSessionData, {
          oldFileName,
          newFileName: fileName,
          directoryName,
          content: mockContent,
          sha,
        })
      ).resolves.toMatchObject({
        name: fileName,
        oldSha: sha,
        sha,
      })
      expect(mockGithubService.getTree).toHaveBeenCalledWith(
        sessionData,
        mockGithubSessionData,
        {
          isRecursive: true,
        }
      )
      expect(mockGithubService.updateTree).toHaveBeenCalledWith(
        sessionData,
        mockGithubSessionData,
        {
          gitTree: mockedMovedTree,
          message: `Renamed ${oldFileName} to ${fileName}`,
        }
      )
      expect(mockGithubService.updateRepoState).toHaveBeenCalledWith(
        sessionData,
        {
          commitSha: treeSha,
        }
      )
    })
  })
})
