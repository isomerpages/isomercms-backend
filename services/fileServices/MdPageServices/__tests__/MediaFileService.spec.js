const { BadRequestError } = require("@errors/BadRequestError")

const { GITHUB_ORG_NAME } = process.env

describe("Media File Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const imageName = "test image.png"
  const fileName = "test file.pdf"
  const directoryName = "images/subfolder"
  const mockContent = "test"
  const mockSanitizedContent = "sanitized-test"
  const sha = "12345"

  const reqDetails = { siteName, accessToken }

  const mockGithubService = {
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getRepoInfo: jest.fn(),
    readMedia: jest.fn(),
  }

  jest.mock("@utils/file-upload-utils", () => ({
    validateAndSanitizeFileUpload: jest
      .fn()
      .mockReturnValue(mockSanitizedContent),
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
        service.create(reqDetails, {
          fileName: "file/file.pdf",
          directoryName,
          content: mockContent,
        })
      ).rejects.toThrowError(BadRequestError)
    })

    mockGithubService.create.mockResolvedValueOnce({ sha })
    it("Creating pages works correctly", async () => {
      await expect(
        service.create(reqDetails, {
          fileName,
          directoryName,
          content: mockContent,
        })
      ).resolves.toMatchObject({
        fileName,
        content: mockSanitizedContent,
        sha,
      })
      expect(mockGithubService.create).toHaveBeenCalledWith(reqDetails, {
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
    mockGithubService.read.mockResolvedValueOnce({
      content: "",
      sha,
    }),
      mockGithubService.getRepoInfo.mockResolvedValueOnce({
        private: false,
      }),
      mockGithubService.readMedia.mockResolvedValueOnce({
        content: mockContent,
      }),
      it("Reading image files in public repos works correctly", async () => {
        const expectedResp = {
          mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${directoryName}/${imageName}`,
          name: imageName,
          sha,
        }
        await expect(
          service.read(reqDetails, {
            fileName: imageName,
            directoryName,
            mediaType: "images",
          })
        ).resolves.toMatchObject(expectedResp)
        expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
          fileName: imageName,
          directoryName,
        })
        expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(reqDetails)
      })
    mockGithubService.read.mockResolvedValueOnce({
      content: "",
      sha,
    }),
      mockGithubService.getRepoInfo.mockResolvedValueOnce({
        private: false,
      }),
      it("Reading svg files in public repos adds sanitisation", async () => {
        const svgName = "image.svg"
        const expectedResp = {
          mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${directoryName}/${svgName}?sanitize=true`,
          name: svgName,
          sha,
        }
        await expect(
          service.read(reqDetails, {
            fileName: svgName,
            directoryName,
            mediaType: "images",
          })
        ).resolves.toMatchObject(expectedResp)
        expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
          fileName: svgName,
          directoryName,
        })
        expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(reqDetails)
      })
    mockGithubService.read.mockResolvedValueOnce({
      content: "",
      sha,
    }),
      mockGithubService.getRepoInfo.mockResolvedValueOnce({
        private: true,
      }),
      it("Reading image files in private repos works correctly", async () => {
        const expectedResp = {
          mediaUrl: `data:image/png;base64,${mockContent}`,
          name: imageName,
          sha,
        }
        await expect(
          service.read(reqDetails, {
            fileName: imageName,
            directoryName,
            mediaType: "images",
          })
        ).resolves.toMatchObject(expectedResp)
        expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
          fileName: imageName,
          directoryName,
        })
        expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(reqDetails)
        expect(mockGithubService.readMedia).toHaveBeenCalledWith(reqDetails, {
          fileSha: sha,
        })
      })
    mockGithubService.read.mockResolvedValueOnce({
      content: "",
      sha,
    }),
      mockGithubService.getRepoInfo.mockResolvedValueOnce({
        private: false,
      }),
      mockGithubService.readMedia.mockResolvedValueOnce({
        content: mockContent,
      }),
      it("Reading files in public repos works correctly", async () => {
        const expectedResp = {
          mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${directoryName}/${fileName}`,
          name: fileName,
          sha,
        }
        await expect(
          service.read(reqDetails, {
            fileName,
            directoryName,
            mediaType: "files",
          })
        ).resolves.toMatchObject(expectedResp)
        expect(mockGithubService.read).toHaveBeenCalledWith(reqDetails, {
          fileName,
          directoryName,
        })
        expect(mockGithubService.getRepoInfo).toHaveBeenCalledWith(reqDetails)
      })
  })

  describe("Update", () => {
    const oldSha = "54321"
    mockGithubService.update.mockResolvedValueOnce({ newSha: sha })
    it("Updating media file content works correctly", async () => {
      await expect(
        service.update(reqDetails, {
          fileName,
          directoryName,
          content: mockContent,
          sha: oldSha,
        })
      ).resolves.toMatchObject({
        fileName,
        content: mockSanitizedContent,
        oldSha,
        newSha: sha,
      })
      expect(mockGithubService.update).toHaveBeenCalledWith(reqDetails, {
        fileName,
        directoryName,
        fileContent: mockSanitizedContent,
        sha: oldSha,
      })
      expect(validateAndSanitizeFileUpload).toHaveBeenCalledWith(mockContent)
    })
  })

  describe("Delete", () => {
    it("Deleting pages works correctly", async () => {
      await expect(
        service.delete(reqDetails, { fileName, directoryName, sha })
      ).resolves.not.toThrow()
      expect(mockGithubService.delete).toHaveBeenCalledWith(reqDetails, {
        fileName,
        directoryName,
        sha,
      })
    })
  })

  describe("Rename", () => {
    const oldSha = "54321"
    const oldFileName = "test old file.pdf"
    mockGithubService.create.mockResolvedValueOnce({ sha })

    it("rejects renaming to page names with special characters", async () => {
      await expect(
        service.rename(reqDetails, {
          oldFileName,
          newFileName: "file/file.pdf",
          directoryName,
          content: mockContent,
        })
      ).rejects.toThrowError(BadRequestError)
    })
    it("Renaming pages works correctly", async () => {
      await expect(
        service.rename(reqDetails, {
          oldFileName,
          newFileName: fileName,
          directoryName,
          content: mockContent,
          sha: oldSha,
        })
      ).resolves.toMatchObject({
        fileName,
        content: mockContent,
        oldSha,
        newSha: sha,
      })
      expect(mockGithubService.delete).toHaveBeenCalledWith(reqDetails, {
        fileName: oldFileName,
        directoryName,
        sha: oldSha,
      })
      expect(mockGithubService.create).toHaveBeenCalledWith(reqDetails, {
        content: mockContent,
        fileName,
        directoryName,
      })
    })
  })
})
