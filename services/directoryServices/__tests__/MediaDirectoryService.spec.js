const { BadRequestError } = require("@errors/BadRequestError")
const { NotFoundError } = require("@errors/NotFoundError")

const { GITHUB_ORG_NAME } = process.env

const PLACEHOLDER_FILE_NAME = ".keep"

describe("Media Directory Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const imageDirectoryName = "images/imageDir"
  const fileDirectoryName = "files/fileDir"

  const objArray = [
    {
      type: "file",
      name: "file.pdf",
    },
    {
      type: "file",
      name: `file2.pdf`,
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
    readMedia: jest.fn(),
    getRepoInfo: jest.fn(),
  }

  const {
    MediaDirectoryService,
  } = require("@services/directoryServices/MediaDirectoryService")
  const service = new MediaDirectoryService({
    baseDirectoryService: mockBaseDirectoryService,
    gitHubService: mockGitHubService,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("ListFiles", () => {
    const mockContent1 = "mock-content-1"
    const mockContent2 = "mock-content-2"
    const testImg1 = {
      name: "test-name.png",
      path: "test-path/test-name.png",
      sha: "test-sha-1",
      size: 10,
      type: "file",
    }
    const testImg2 = {
      name: "test-name.svg",
      path: "test-path/test-name.svg",
      sha: "test-sha-2",
      size: 10,
      type: "file",
    }
    const testFile1 = {
      name: "test-name.pdf",
      path: "test-path/test-name.pdf",
      sha: "test-sha-1",
      size: 10,
      type: "file",
    }
    const testFile2 = {
      name: "test-name.pdf",
      path: "test-path/test-name.pdf",
      sha: "test-sha-2",
      size: 10,
      type: "file",
    }

    const readImgDirResp = [testImg1, testImg2]
    const readFileDirResp = [testFile1, testFile2]
    mockGitHubService.getRepoInfo.mockResolvedValueOnce({
      private: false,
    })
    mockBaseDirectoryService.list.mockResolvedValueOnce(readImgDirResp)
    it("ListFiles for an image directory in a public repo returns all images properly formatted", async () => {
      const expectedResp = [
        {
          mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${testImg1.path}`,
          name: testImg1.name,
          sha: testImg1.sha,
        },
        {
          mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${testImg2.path}?sanitize=true`,
          name: testImg2.name,
          sha: testImg2.sha,
        },
      ]
      await expect(
        service.listFiles(reqDetails, {
          mediaType: "images",
          directoryName: imageDirectoryName,
        })
      ).resolves.toMatchObject(expectedResp)
      expect(mockGitHubService.getRepoInfo).toHaveBeenCalledWith(reqDetails)
      expect(mockBaseDirectoryService.list).toHaveBeenCalledWith(reqDetails, {
        directoryName: imageDirectoryName,
      })
    })
    mockGitHubService.getRepoInfo.mockResolvedValueOnce({
      private: true,
    })
    mockBaseDirectoryService.list.mockResolvedValueOnce(readImgDirResp)
    mockGitHubService.readMedia.mockResolvedValueOnce({
      content: mockContent1,
    })
    mockGitHubService.readMedia.mockResolvedValueOnce({
      content: mockContent2,
    })
    it("ListFiles for an image directory in a private repo returns all images properly formatted", async () => {
      const expectedResp = [
        {
          mediaUrl: `data:image/png;base64,${mockContent1}`,
          name: testImg1.name,
          sha: testImg1.sha,
        },
        {
          mediaUrl: `data:image/svg+xml;base64,${mockContent2}`,
          name: testImg2.name,
          sha: testImg2.sha,
        },
      ]
      await expect(
        service.listFiles(reqDetails, {
          mediaType: "images",
          directoryName: imageDirectoryName,
        })
      ).resolves.toMatchObject(expectedResp)
      expect(mockGitHubService.getRepoInfo).toHaveBeenCalledWith(reqDetails)
      expect(mockBaseDirectoryService.list).toHaveBeenCalledWith(reqDetails, {
        directoryName: imageDirectoryName,
      })
    })
    mockGitHubService.getRepoInfo.mockResolvedValueOnce({
      private: false,
    })
    mockBaseDirectoryService.list.mockResolvedValueOnce(readFileDirResp)
    it("ListFiles for a file directory in a public repo returns all files properly formatted", async () => {
      const expectedResp = [
        {
          mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${testFile1.path}`,
          name: testFile1.name,
          sha: testFile1.sha,
        },
        {
          mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${testFile2.path}`,
          name: testFile2.name,
          sha: testFile2.sha,
        },
      ]
      await expect(
        service.listFiles(reqDetails, {
          mediaType: "files",
          directoryName: fileDirectoryName,
        })
      ).resolves.toMatchObject(expectedResp)
      expect(mockGitHubService.getRepoInfo).toHaveBeenCalledWith(reqDetails)
      expect(mockBaseDirectoryService.list).toHaveBeenCalledWith(reqDetails, {
        directoryName: fileDirectoryName,
      })
    })
  })

  describe("CreateMediaDirectory", () => {
    it("rejects directories with special characters", async () => {
      await expect(
        service.createMediaDirectory(reqDetails, {
          directoryName: "dir/dir",
        })
      ).rejects.toThrowError(BadRequestError)
    })

    it("Creating a directory with no specified files works correctly", async () => {
      await expect(
        service.createMediaDirectory(reqDetails, {
          directoryName: imageDirectoryName,
        })
      ).resolves.toMatchObject({
        newDirectoryName: imageDirectoryName,
      })
    })
  })

  describe("RenameMediaDirectory", () => {
    const newDirectoryName = "images/new dir"
    it("rejects names with special characters", async () => {
      await expect(
        service.renameMediaDirectory(reqDetails, {
          directoryName: imageDirectoryName,
          newDirectoryName: "dir/dir",
        })
      ).rejects.toThrowError(BadRequestError)
    })

    it("Renaming a media directory works correctly", async () => {
      await expect(
        service.renameMediaDirectory(reqDetails, {
          directoryName: imageDirectoryName,
          newDirectoryName,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.rename).toHaveBeenCalledWith(reqDetails, {
        oldDirectoryName: imageDirectoryName,
        newDirectoryName,
        message: `Renaming media folder ${imageDirectoryName} to ${newDirectoryName}`,
      })
    })
  })

  describe("DeleteMediaDirectory", () => {
    it("Deleting a directory works correctly", async () => {
      await expect(
        service.deleteMediaDirectory(reqDetails, {
          directoryName: imageDirectoryName,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.delete).toHaveBeenCalledWith(reqDetails, {
        directoryName: imageDirectoryName,
        message: `Deleting media folder ${imageDirectoryName}`,
      })
    })
  })

  describe("MoveMediaFiles", () => {
    const targetDirectoryName = "files/target directory"
    const targetFiles = objArray.map((item) => item.name)
    it("Moving media in a media directory to another media directory works correctly", async () => {
      await expect(
        service.moveMediaFiles(reqDetails, {
          directoryName: fileDirectoryName,
          targetDirectoryName,
          objArray,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.moveFiles).toHaveBeenCalledWith(
        reqDetails,
        {
          oldDirectoryName: fileDirectoryName,
          newDirectoryName: targetDirectoryName,
          targetFiles,
          message: `Moving media files from ${fileDirectoryName} to ${targetDirectoryName}`,
        }
      )
    })
  })
})
