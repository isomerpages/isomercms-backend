const { config } = require("@config/config")

const { BadRequestError } = require("@errors/BadRequestError")

const {
  MediaFileService,
} = require("@services/fileServices/MdPageServices/MediaFileService")

const GITHUB_ORG_NAME = config.get("github.orgName")

describe("Media File Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const imageName = "test image.png"
  const imageEncodedName = encodeURIComponent(imageName)
  const fileName = "test file.jpg"
  const fileEncodedName = encodeURIComponent(fileName)
  const directoryName = "images/subfolder"
  const sha = "12345"
  const mockGithubSessionData = "githubData"
  const mockContent =
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMHEBMRBxMRFhUXFhgPGBAWFRYdFxIXFxYWFxUVFhMYHiogGBolGxgVITEiJikrOjEuFyA1OzMsNygtLisBCjxoMj5oZWxsbzwvaDI+Cg=="
  const mockSanitizedContent = mockContent.split(",")[1]

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

  // NOTE: Mock just the scan function
  // as we want to omit network calls.
  jest.mock("@utils/file-upload-utils", () => ({
    ...jest.requireActual("@utils/file-upload-utils"),
    scanFileForVirus: jest.fn().mockReturnValue({ CleanResult: true }),
  }))

  const service = new MediaFileService({
    repoService: mockRepoService,
  })

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

    it("Creating pages works correctly", async () => {
      // Arrange
      mockRepoService.create.mockResolvedValueOnce({ sha })

      const result = await service.create(sessionData, {
        fileName,
        directoryName,
        content: mockContent,
      })
      expect(result).toMatchObject({
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
    })

    it("should ignore the extension provided by the user", async () => {
      // Arrange
      mockRepoService.create.mockResolvedValueOnce({ sha })
      const fileNameWithWrongExt = "wrong.html"

      // Act
      const result = await service.create(sessionData, {
        fileName: fileNameWithWrongExt,
        directoryName,
        content: mockContent,
      })

      // Assert
      // NOTE: The original extension here is not used.
      // Instead, we use the inferred extension.
      expect(result.name).toBe("wrong.jpg")
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
    it("Updating media file content works correctly", async () => {
      mockRepoService.create.mockResolvedValueOnce({ sha })
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
    const oldFileName = "test old file.jpg"

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
