const { config } = require("@config/config")

const { BadRequestError } = require("@errors/BadRequestError")

const GITHUB_ORG_NAME = config.get("github.orgName")

describe("Media File Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const imageName = "test image.png"
  const imageEncodedName = encodeURIComponent(imageName)
  const fileName = "test file.pdf"
  const fileEncodedName = encodeURIComponent(fileName)
  const directoryName = "images/subfolder"
  const mockContent = "schema, test"
  const mockSanitizedContent = "sanitized-test"
  const sha = "12345"
  const mockGithubSessionData = "githubData"

  const sessionData = { siteName, accessToken }

  const mockRepoService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMultipleFiles: jest.fn(),
    getRepoInfo: jest.fn(),
    readMediaFile: jest.fn(),
    readDirectory: jest.fn(),
    renameSinglePath: jest.fn(),
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
    repoService: mockRepoService,
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

    mockRepoService.create.mockResolvedValueOnce({ sha })
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
      expect(mockRepoService.create).toHaveBeenCalledWith(sessionData, {
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
    it("Reading image files in public repos works correctly", async () => {
      const expectedResp = {
        mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${directoryName}/${imageEncodedName}`,
        name: imageName,
        sha,
      }

      mockRepoService.readMediaFile.mockResolvedValueOnce(expectedResp)
      await expect(
        service.read(sessionData, {
          fileName: imageName,
          directoryName,
        })
      ).resolves.toMatchObject(expectedResp)
      expect(mockRepoService.readMediaFile).toHaveBeenCalledWith(sessionData, {
        fileName: imageName,
        directoryName,
      })
    })
    const svgName = "image.svg"

    it("Reading svg files in public repos adds sanitisation", async () => {
      const expectedResp = {
        mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${directoryName}/${svgName}?sanitize=true`,
        name: svgName,
        sha,
      }

      mockRepoService.readMediaFile.mockResolvedValueOnce(expectedResp)
      await expect(
        service.read(sessionData, {
          fileName: svgName,
          directoryName,
          mediaType: "images",
        })
      ).resolves.toMatchObject(expectedResp)
    })
    it("Reading files in public repos works correctly", async () => {
      const expectedResp = {
        mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${directoryName}/${fileEncodedName}`,
        name: fileName,
        sha,
      }

      mockRepoService.readMediaFile.mockResolvedValueOnce(expectedResp)

      await expect(
        service.read(sessionData, {
          fileName,
          directoryName,
          mediaType: "files",
        })
      ).resolves.toMatchObject(expectedResp)
      expect(mockRepoService.readMediaFile).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
      })
    })
  })

  describe("Update", () => {
    const oldSha = "54321"
    mockRepoService.create.mockResolvedValueOnce({ sha })
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
      expect(mockRepoService.delete).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
        sha: oldSha,
      })
      expect(mockRepoService.create).toHaveBeenCalledWith(sessionData, {
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
      expect(mockRepoService.delete).toHaveBeenCalledWith(sessionData, {
        fileName,
        directoryName,
        sha,
      })
    })
  })

  describe("Rename", () => {
    const oldFileName = "test old file.pdf"

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
      mockRepoService.renameSinglePath.mockResolvedValueOnce({
        newSha: sha,
      })

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

      expect(mockRepoService.renameSinglePath).toHaveBeenCalledWith(
        sessionData,
        mockGithubSessionData,
        `${directoryName}/${oldFileName}`,
        `${directoryName}/${fileName}`,
        `Renamed ${oldFileName} to ${fileName}`
      )
    })
  })

  describe("DeleteMultipleFiles", () => {
    it("rejects page names with special characters", async () => {
      await expect(
        service.deleteMultipleFiles(sessionData, mockGithubSessionData, {
          items: [
            { filePath: "file/file%%%name.pdf", sha },
            { filePath: "valid.pdf", sha },
          ],
        })
      ).rejects.toThrowError(BadRequestError)
    })

    it("Deleting multiple pages works correctly", async () => {
      const mockFiles = [
        { filePath: "images/valid.jpg", sha },
        { filePath: "images/another/valid.jpg", sha },
      ]

      mockRepoService.deleteMultipleFiles.mockResolvedValueOnce(undefined)

      await expect(
        service.deleteMultipleFiles(sessionData, mockGithubSessionData, {
          items: mockFiles,
        })
      ).resolves.not.toThrow()

      expect(mockRepoService.deleteMultipleFiles).toHaveBeenCalledWith(
        sessionData,
        mockGithubSessionData,
        {
          items: mockFiles,
        }
      )
    })
  })
})
