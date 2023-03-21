const { config } = require("@config/config")

const { BadRequestError } = require("@errors/BadRequestError")

const GITHUB_ORG_NAME = config.get("github.orgName")

const PLACEHOLDER_FILE_NAME = ".keep"

describe("Media Directory Service", () => {
  const siteName = "test-site"
  const accessToken = "test-token"
  const imageSubdirectory = "imageDir"
  const imageDirectoryName = `images/${imageSubdirectory}`
  const fileSubdirectory = "fileDir"
  const fileDirectoryName = `files/${fileSubdirectory}`
  const mockGithubSessionData = "mockData"

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
    const dir = {
      name: "dir",
      type: "dir",
    }
    const placeholder = {
      name: PLACEHOLDER_FILE_NAME,
      type: "file",
    }

    const readImgDirResp = [testImg1, testImg2, dir, placeholder]
    const readFileDirResp = [testFile1, testFile2, dir, placeholder]
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
          mediaPath: `${imageDirectoryName}/${testImg1.name}`,
        },
        {
          mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${testImg2.path}?sanitize=true`,
          name: testImg2.name,
          sha: testImg2.sha,
          mediaPath: `${imageDirectoryName}/${testImg2.name}`,
        },
        {
          name: dir.name,
          type: dir.type,
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
          mediaPath: `${imageDirectoryName}/${testImg1.name}`,
        },
        {
          mediaUrl: `data:image/svg+xml;base64,${mockContent2}`,
          name: testImg2.name,
          sha: testImg2.sha,
          mediaPath: `${imageDirectoryName}/${testImg2.name}`,
        },
        {
          name: dir.name,
          type: dir.type,
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
          mediaPath: `${fileDirectoryName}/${testFile1.name}`,
        },
        {
          mediaUrl: `https://raw.githubusercontent.com/${GITHUB_ORG_NAME}/${siteName}/staging/${testFile2.path}`,
          name: testFile2.name,
          sha: testFile2.sha,
          mediaPath: `${fileDirectoryName}/${testFile2.name}`,
        },
        {
          name: dir.name,
          type: dir.type,
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
        service.createMediaDirectory(reqDetails, mockGithubSessionData, {
          directoryName: "dir/dir",
          objArray: undefined,
        })
      ).rejects.toThrowError(BadRequestError)
    })

    it("Creating a directory with no specified files works correctly", async () => {
      await expect(
        service.createMediaDirectory(reqDetails, mockGithubSessionData, {
          directoryName: imageDirectoryName,
          objArray: undefined,
        })
      ).resolves.toMatchObject({
        newDirectoryName: `images/${imageSubdirectory}`,
      })
      expect(mockGitHubService.create).toHaveBeenCalledWith(reqDetails, {
        content: "",
        fileName: PLACEHOLDER_FILE_NAME,
        directoryName: imageDirectoryName,
      })
    })

    it("Creating a directory with specified files works correctly", async () => {
      const newDirectoryName = `${fileDirectoryName}/newSubfolder`
      const objArray = [
        {
          name: `fileName`,
          type: `file`,
        },
        {
          name: `fileName2`,
          type: `file`,
        },
      ]
      await expect(
        service.createMediaDirectory(reqDetails, mockGithubSessionData, {
          directoryName: newDirectoryName,
          objArray,
        })
      ).resolves.toMatchObject({
        newDirectoryName,
      })
      expect(mockGitHubService.create).toHaveBeenCalledWith(reqDetails, {
        content: "",
        fileName: PLACEHOLDER_FILE_NAME,
        directoryName: newDirectoryName,
      })
      expect(mockBaseDirectoryService.moveFiles).toHaveBeenCalledWith(
        reqDetails,
        mockGithubSessionData,
        {
          oldDirectoryName: fileDirectoryName,
          newDirectoryName,
          targetFiles: objArray.map((file) => file.name),
          message: `Moving media files from ${fileDirectoryName} to ${newDirectoryName}`,
        }
      )
    })
  })

  describe("RenameMediaDirectory", () => {
    const newDirectoryName = "images/new dir"
    it("rejects names with special characters", async () => {
      await expect(
        service.renameMediaDirectory(reqDetails, mockGithubSessionData, {
          directoryName: imageDirectoryName,
          newDirectoryName: "dir/dir",
        })
      ).rejects.toThrowError(BadRequestError)
    })

    it("Renaming a media directory works correctly", async () => {
      await expect(
        service.renameMediaDirectory(reqDetails, mockGithubSessionData, {
          directoryName: imageDirectoryName,
          newDirectoryName,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.rename).toHaveBeenCalledWith(
        reqDetails,
        mockGithubSessionData,
        {
          oldDirectoryName: imageDirectoryName,
          newDirectoryName,
          message: `Renaming media folder ${imageDirectoryName} to ${newDirectoryName}`,
        }
      )
    })
  })

  describe("DeleteMediaDirectory", () => {
    it("Deleting a directory works correctly", async () => {
      await expect(
        service.deleteMediaDirectory(reqDetails, mockGithubSessionData, {
          directoryName: imageDirectoryName,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.delete).toHaveBeenCalledWith(
        reqDetails,
        mockGithubSessionData,
        {
          directoryName: imageDirectoryName,
          message: `Deleting media folder ${imageDirectoryName}`,
        }
      )
    })
  })

  describe("MoveMediaFiles", () => {
    const targetDirectoryName = "files/target directory"
    const targetFiles = objArray.map((item) => item.name)
    it("Moving media in a media directory to another media directory works correctly", async () => {
      await expect(
        service.moveMediaFiles(reqDetails, mockGithubSessionData, {
          directoryName: fileDirectoryName,
          targetDirectoryName,
          objArray,
        })
      ).resolves.not.toThrowError()
      expect(mockBaseDirectoryService.moveFiles).toHaveBeenCalledWith(
        reqDetails,
        mockGithubSessionData,
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
