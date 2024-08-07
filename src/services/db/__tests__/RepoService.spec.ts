import { AxiosInstance } from "axios"
import { okAsync } from "neverthrow"

import {
  mockAccessToken,
  mockEmail,
  mockGithubId,
  mockGithubSessionData,
  mockGrowthBook,
  mockIsomerUserId,
  mockUserWithSiteSessionDataAndGrowthBook,
} from "@fixtures/sessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { ItemType, MediaDirOutput, MediaFileOutput } from "@root/types"
import { GitHubCommitData } from "@root/types/commitData"
import {
  GitCommitResult,
  GitDirectoryItem,
  GitFile,
} from "@root/types/gitfilesystem"
import * as mediaUtils from "@root/utils/media-utils"
import GitFileSystemService from "@services/db/GitFileSystemService"
import _RepoService from "@services/db/RepoService"

import GitFileCommitService from "../GitFileCommitService"
import GitHubService from "../GitHubService"

const MockAxiosInstance = {
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
}

const MockGitFileSystemService = {
  read: jest.fn(),
  readMediaFile: jest.fn(),
  create: jest.fn(),
  listDirectoryContents: jest.fn(),
  listPaginatedDirectoryContents: jest.fn(),
  push: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteMultipleFiles: jest.fn(),
  getLatestCommitOfBranch: jest.fn(),
  renameSinglePath: jest.fn(),
  moveFiles: jest.fn(),
  updateRepoState: jest.fn(),
}

const MockGitFileCommitService = {
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteMultipleFiles: jest.fn(),
  deleteDirectory: jest.fn(),
  renameSinglePath: jest.fn(),
  moveFiles: jest.fn(),
}

const RepoService = new _RepoService({
  isomerRepoAxiosInstance: (MockAxiosInstance as unknown) as AxiosInstance,
  gitFileSystemService: (MockGitFileSystemService as unknown) as GitFileSystemService,
  gitFileCommitService: (MockGitFileCommitService as unknown) as GitFileCommitService,
})

describe("RepoService", () => {
  const gbSpy = jest.spyOn(mockGrowthBook, "getFeatureValue")

  // Prevent inter-test pollution of mocks
  afterEach(() => {
    jest.clearAllMocks()
  })

  // load ggs enabled sites into growthbook
  beforeAll(() => {
    mockGrowthBook.setFeatures({
      is_ggs_enabled: {
        defaultValue: true,
      },
    })
  })

  describe("create", () => {
    it("should create using the local Git file system using utf-8 for non-media files if the repo is ggs enabled", async () => {
      const returnedSha = "test-sha"
      const mockContent = "content"
      const mockFileName = "test.md"
      const mockDirectoryName = ""
      const createOutput = {
        sha: returnedSha,
      }
      const expected = {
        sha: returnedSha,
      }
      gbSpy.mockReturnValueOnce(true)
      MockGitFileCommitService.create.mockResolvedValueOnce(createOutput)
      const isMedia = false
      const actual = await RepoService.create(
        mockUserWithSiteSessionDataAndGrowthBook,
        {
          content: mockContent,
          fileName: mockFileName,
          directoryName: mockDirectoryName,
          isMedia,
        }
      )

      expect(actual).toEqual(expected)
      expect(MockGitFileCommitService.create).toHaveBeenCalledWith(
        mockUserWithSiteSessionDataAndGrowthBook,
        {
          content: mockContent,
          fileName: mockFileName,
          directoryName: mockDirectoryName,
          isMedia,
        }
      )
    })

    it("should create using the local Git file system using base64 for media files if the repo is ggs enabled", async () => {
      const returnedSha = "test-sha"
      const mockContent = "content"
      const mockFileName = "test.md"
      const mockDirectoryName = ""
      const createOutput = {
        sha: returnedSha,
      }
      const expected = {
        sha: returnedSha,
      }
      gbSpy.mockReturnValueOnce(true)
      MockGitFileCommitService.create.mockResolvedValueOnce(createOutput)

      const actual = await RepoService.create(
        mockUserWithSiteSessionDataAndGrowthBook,
        {
          content: mockContent,
          fileName: mockFileName,
          directoryName: mockDirectoryName,
          isMedia: true,
        }
      )

      expect(actual).toEqual(expected)
      expect(MockGitFileCommitService.create).toHaveBeenCalledWith(
        mockUserWithSiteSessionDataAndGrowthBook,
        {
          content: mockContent,
          fileName: mockFileName,
          directoryName: mockDirectoryName,
          isMedia: true,
        }
      )
    })

    it("should create files on GitHub directly if the repo is not whitelisted", async () => {
      const mockContent = "content"
      const mockFileName = "test.md"
      const mockDirectoryName = ""
      const isMedia = false
      const sessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })
      const expected = {
        sha: "test-sha",
      }
      const gitHubServiceCreate = jest.spyOn(GitHubService.prototype, "create")
      gitHubServiceCreate.mockResolvedValueOnce(expected)

      const actual = await RepoService.create(sessionData, {
        content: "content",
        fileName: "test.md",
        directoryName: "",
        isMedia,
      })

      expect(actual).toEqual(expected)
      expect(gitHubServiceCreate).toHaveBeenCalledWith(sessionData, {
        content: mockContent,
        fileName: mockFileName,
        directoryName: mockDirectoryName,
        isMedia,
      })
    })
  })

  describe("read", () => {
    it("should read from the local Git file system if the repo is ggs enabled", async () => {
      const expected: GitFile = {
        content: "test content",
        sha: "test-sha",
      }
      gbSpy.mockReturnValueOnce(true)
      MockGitFileSystemService.read.mockResolvedValueOnce(okAsync(expected))

      const actual = await RepoService.read(
        mockUserWithSiteSessionDataAndGrowthBook,
        {
          fileName: "test.md",
          directoryName: "",
        }
      )

      expect(actual).toEqual(expected)
    })

    it("should read from GitHub directly if the repo is ggs enabled", async () => {
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })
      const expected: GitFile = {
        content: "test content",
        sha: "test-sha",
      }
      gbSpy.mockReturnValueOnce(true)
      const gitHubServiceRead = jest.spyOn(GitHubService.prototype, "read")
      gitHubServiceRead.mockResolvedValueOnce(expected)

      const actual = await RepoService.read(sessionData, {
        fileName: "test.md",
        directoryName: "",
      })

      expect(actual).toEqual(expected)
    })
  })

  describe("readMediaFile", () => {
    it("should read image from the local Git file system for ggs enabled repos", async () => {
      const expected: MediaFileOutput = {
        name: "test content",
        sha: "test-sha",
        mediaUrl: "sampleBase64Img",
        mediaPath: "images/test-img.jpeg",
        type: "image" as ItemType,
        addedTime: 0,
        size: 0,
      }
      gbSpy.mockReturnValueOnce(true)
      MockGitFileSystemService.readMediaFile.mockResolvedValueOnce(
        okAsync(expected)
      )

      const actual = await RepoService.readMediaFile(
        mockUserWithSiteSessionDataAndGrowthBook,
        {
          directoryName: "test",
          fileName: "test content",
        }
      )

      expect(actual).toEqual(expected)
    })

    it("should read image from GitHub for non-ggs enabled repos", async () => {
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })

      const expected: MediaFileOutput = {
        name: "test-image",
        sha: "test-sha",
        mediaUrl: "http://some-cdn.com/image",
        mediaPath: "images/test-img.jpeg",
        type: "image" as ItemType,
        addedTime: 0,
        size: 0,
      }

      const gitHubServiceReadDirectory = jest.spyOn(
        GitHubService.prototype,
        "readDirectory"
      )
      const gitHubServiceGetLatestCommitOfPath = jest.spyOn(
        GitHubService.prototype,
        "getLatestCommitOfPath"
      )
      const gitHubServiceGetRepoInfo = jest.spyOn(
        GitHubService.prototype,
        "getRepoInfo"
      )
      gitHubServiceReadDirectory.mockResolvedValueOnce([
        {
          name: ".keep",
        },
        {
          name: "test-image",
        },
        {
          name: "fake-dir",
        },
      ])
      gitHubServiceGetLatestCommitOfPath.mockResolvedValueOnce({
        author: {
          date: 0,
        },
      })
      gitHubServiceGetRepoInfo.mockResolvedValueOnce({
        description: "",
        private: false,
      })
      const getMediaFileInfo = jest
        .spyOn(mediaUtils, "getMediaFileInfo")
        .mockResolvedValueOnce(expected)

      const actual = await RepoService.readMediaFile(sessionData, {
        directoryName: "images",
        fileName: "test-image",
      })

      expect(actual).toEqual(expected)
      expect(getMediaFileInfo).toBeCalledTimes(1)
    })
  })

  describe("readDirectory", () => {
    it("should read from the local Git file system if the repo is ggs enabled", async () => {
      const expected: GitDirectoryItem[] = [
        {
          name: "fake-dir",
          type: "dir",
          sha: "test-sha3",
          path: "fake-dir",
          size: 0,
          addedTime: 1,
        },
        {
          name: "fake-file.md",
          type: "file",
          sha: "test-sha1",
          path: "test/fake-file.md",
          size: 100,
          addedTime: 3,
        },
        {
          name: "another-fake-file.md",
          type: "file",
          sha: "test-sha2",
          path: "another-fake-file.md",
          size: 100,
          addedTime: 2,
        },
      ]
      gbSpy.mockReturnValueOnce(true)
      MockGitFileSystemService.listDirectoryContents.mockResolvedValueOnce(
        okAsync(expected)
      )

      const actual = await RepoService.readDirectory(
        mockUserWithSiteSessionDataAndGrowthBook,
        {
          directoryName: "test",
        }
      )

      expect(actual).toEqual(expected)
    })

    it("should read from GitHub directly if the repo is not ggs enabled", async () => {
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })
      const expected: GitDirectoryItem[] = [
        {
          name: "fake-file.md",
          type: "file",
          sha: "test-sha1",
          path: "test/fake-file.md",
          size: 100,
          addedTime: 3,
        },
        {
          name: "another-fake-file.md",
          type: "file",
          sha: "test-sha2",
          path: "another-fake-file.md",
          size: 100,
          addedTime: 2,
        },
        {
          name: "fake-dir",
          type: "dir",
          sha: "test-sha3",
          path: "fake-dir",
          size: 0,
          addedTime: 1,
        },
      ]
      const gitHubServiceReadDirectory = jest.spyOn(
        GitHubService.prototype,
        "readDirectory"
      )
      gitHubServiceReadDirectory.mockResolvedValueOnce(expected)

      const actual = await RepoService.readDirectory(sessionData, {
        directoryName: "test",
      })

      expect(actual).toEqual(expected)
    })
  })

  describe("readMediaDirectory", () => {
    it("should return an array of files and directories from disk if repo is ggs enabled", async () => {
      const testDir: MediaDirOutput = {
        name: "imageDir",
        type: "dir",
      }
      const testFile: MediaFileOutput = {
        name: "image-name",
        sha: "test-sha",
        mediaUrl: "base64ofimage",
        mediaPath: "images/image-name.jpg",
        type: "file",
        addedTime: 0,
        size: 0,
      }
      const expected = {
        directories: [testDir],
        files: [testFile],
        total: 1,
      }
      MockGitFileSystemService.listPaginatedDirectoryContents.mockResolvedValueOnce(
        okAsync(expected)
      )

      const actual = await RepoService.readMediaDirectory(
        mockUserWithSiteSessionDataAndGrowthBook,
        "images"
      )

      expect(actual).toEqual(expected)
    })

    it("should return an array of files and directories from GitHub if repo is not ggs enabled", async () => {
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })

      const testDirectory: MediaDirOutput = {
        name: "imageDir",
        type: "dir",
      }

      const testFile: MediaFileOutput = {
        name: "image-name",
        sha: "test-sha",
        mediaUrl: "base64ofimage",
        mediaPath: "images/image-name.jpg",
        type: "file",
        addedTime: 0,
        size: 0,
      }

      const expected = {
        directories: [testDirectory],
        files: [testFile],
        total: 1,
      }

      const gitHubServiceReadDirectory = jest
        .spyOn(GitHubService.prototype, "readDirectory")
        .mockResolvedValueOnce([testDirectory, testFile])

      const actual = await RepoService.readMediaDirectory(sessionData, "images")

      expect(actual).toEqual(expected)
      expect(gitHubServiceReadDirectory).toBeCalledTimes(1)
    })
  })

  describe("update", () => {
    it("should update the local Git file system if the repo is ggs enabled", async () => {
      const expected: GitCommitResult = { newSha: "fake-commit-sha" }
      MockGitFileCommitService.update.mockResolvedValueOnce(expected)

      const actual = await RepoService.update(
        mockUserWithSiteSessionDataAndGrowthBook,
        {
          fileContent: "test content",
          sha: "fake-original-sha",
          fileName: "test.md",
          directoryName: "pages",
        }
      )

      expect(actual).toEqual(expected)
    })

    it("should update GitHub directly if the repo is not ggs enabled", async () => {
      const expectedSha = "fake-commit-sha"
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })
      const gitHubServiceUpdate = jest.spyOn(GitHubService.prototype, "update")
      gitHubServiceUpdate.mockResolvedValueOnce({ newSha: expectedSha })

      const actual = await RepoService.update(sessionData, {
        fileContent: "test content",
        sha: "fake-original-sha",
        fileName: "test.md",
        directoryName: "pages",
      })

      expect(actual).toEqual({ newSha: expectedSha })
    })
  })

  describe("delete", () => {
    it("should delete a file from Git file system when repo is ggs enabled", async () => {
      MockGitFileCommitService.delete.mockResolvedValueOnce(
        okAsync("some-fake-sha")
      )
      gbSpy.mockReturnValueOnce(true)

      await RepoService.delete(mockUserWithSiteSessionDataAndGrowthBook, {
        sha: "fake-original-sha",
        fileName: "test.md",
        directoryName: "pages",
      })

      expect(MockGitFileCommitService.delete).toBeCalledTimes(1)
      expect(MockGitFileCommitService.delete).toBeCalledWith(
        mockUserWithSiteSessionDataAndGrowthBook,
        {
          sha: "fake-original-sha",
          fileName: "test.md",
          directoryName: "pages",
        }
      )
    })

    it("should delete a file from GitHub when repo is not ggs enabled", async () => {
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })

      const mockedGitHubService = jest
        .spyOn(GitHubService.prototype, "delete")
        .mockResolvedValueOnce(undefined)

      await RepoService.delete(sessionData, {
        sha: "fake-original-sha",
        fileName: "test.md",
        directoryName: "pages",
      })

      expect(mockedGitHubService).toBeCalledWith(sessionData, {
        sha: "fake-original-sha",
        fileName: "test.md",
        directoryName: "pages",
      })
    })
  })

  describe("deleteMultipleFiles", () => {
    const mockFiles = [
      {
        filePath: "fake-dir/fake-file-one",
        sha: "fake-sha-one",
      },
      {
        filePath: "another-fake-dir/fake-file-two",
        sha: "fake-sha-two",
      },
    ]

    it("should delete multiple files from Git file system when repo is ggs enabled", async () => {
      MockGitFileCommitService.deleteMultipleFiles.mockResolvedValueOnce(
        okAsync("some-fake-sha")
      )
      gbSpy.mockReturnValueOnce(true)

      await RepoService.deleteMultipleFiles(
        mockUserWithSiteSessionDataAndGrowthBook,
        mockGithubSessionData,
        {
          items: mockFiles,
        }
      )

      expect(MockGitFileCommitService.deleteMultipleFiles).toBeCalledTimes(1)
      expect(MockGitFileCommitService.deleteMultipleFiles).toBeCalledWith(
        mockUserWithSiteSessionDataAndGrowthBook,
        mockGithubSessionData,
        {
          items: mockFiles,
        }
      )
    })

    it("should delete multiple files from GitHub when repo is not ggs enabled", async () => {
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })

      const mockedGitHubService = jest
        .spyOn(GitHubService.prototype, "deleteMultipleFiles")
        .mockResolvedValueOnce(undefined)

      await RepoService.deleteMultipleFiles(
        sessionData,
        mockGithubSessionData,
        {
          items: mockFiles,
        }
      )

      expect(mockedGitHubService).toBeCalledWith(
        sessionData,
        mockGithubSessionData,
        {
          items: mockFiles,
        }
      )
    })
  })

  describe("renameSinglePath", () => {
    it("should rename using the local Git file system if the repo is ggs enabled", async () => {
      const expected: GitCommitResult = { newSha: "fake-commit-sha" }
      MockGitFileCommitService.renameSinglePath.mockResolvedValueOnce(expected)
      gbSpy.mockReturnValueOnce(true)

      const actual = await RepoService.renameSinglePath(
        mockUserWithSiteSessionDataAndGrowthBook,
        mockGithubSessionData,
        "fake-old-path",
        "fake-new-path",
        "fake-commit-message"
      )

      expect(actual).toEqual(expected)
    })

    it("should rename file using GitHub directly if the repo is not ggs enabled", async () => {
      const expectedSha = "fake-commit-sha"
      const fakeCommitMessage = "fake-commit-message"
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })

      const gitHubServiceRenameSinglePath = jest.spyOn(
        GitHubService.prototype,
        "renameSinglePath"
      )
      gitHubServiceRenameSinglePath.mockResolvedValueOnce({
        newSha: expectedSha,
      })

      const actual = await RepoService.renameSinglePath(
        sessionData,
        mockGithubSessionData,
        "fake-path/old-fake-file.md",
        "fake-path/new-fake-file.md",
        fakeCommitMessage
      )

      expect(actual).toEqual({ newSha: expectedSha })
    })
  })

  describe("moveFiles", () => {
    it("should move files using the Git local file system if the repo is ggs enabled", async () => {
      const expected = { newSha: "fake-commit-sha" }
      MockGitFileCommitService.moveFiles.mockResolvedValueOnce(expected)
      gbSpy.mockReturnValueOnce(true)
      // MockCommitServiceGitFile.push.mockReturnValueOnce(undefined)

      const actual = await RepoService.moveFiles(
        mockUserWithSiteSessionDataAndGrowthBook,
        mockGithubSessionData,
        "fake-old-path",
        "fake-new-path",
        ["fake-file1", "fake-file2"],
        "fake-commit-message"
      )

      expect(actual).toEqual(expected)
    })

    it("should move files using GitHub directly if the repo is not ggs enabled", async () => {
      const expected = { newSha: "fake-commit-sha" }
      const fakeCommitMessage = "fake-commit-message"
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })

      const gitHubServiceMoveFiles = jest.spyOn(
        GitHubService.prototype,
        "moveFiles"
      )
      gitHubServiceMoveFiles.mockResolvedValueOnce(expected)

      const actual = await RepoService.moveFiles(
        sessionData,
        mockGithubSessionData,
        "fake-path",
        "fake-new-path",
        ["old-fake-file.md", "old-fake-file-two.md"],
        fakeCommitMessage
      )

      expect(actual).toEqual(expected)
    })
  })

  describe("getLatestCommitOfBranch", () => {
    it("should read the latest commit data from the local Git file system if the repo is ggs enabled", async () => {
      const expected: GitHubCommitData = {
        author: {
          name: "test author",
          email: "test@email.com",
          date: "2023-07-20T11:25:05+08:00",
        },
        sha: "test-sha",
        message: "test message",
      }
      gbSpy.mockReturnValueOnce(true)
      MockGitFileSystemService.getLatestCommitOfBranch.mockResolvedValueOnce(
        okAsync(expected)
      )

      const actual = await RepoService.getLatestCommitOfBranch(
        mockUserWithSiteSessionDataAndGrowthBook,
        "master"
      )
      expect(actual).toEqual(expected)
    })

    it("should read latest commit data from GitHub if the repo is not ggs enabled", async () => {
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })
      const expected: GitHubCommitData = {
        author: {
          name: "test author",
          email: "test@email.com",
          date: "2023-07-20T11:25:05+08:00",
        },
        message: "test message",
      }
      const gitHubServiceReadDirectory = jest.spyOn(
        GitHubService.prototype,
        "getLatestCommitOfBranch"
      )
      gitHubServiceReadDirectory.mockResolvedValueOnce(expected)
      const actual = await RepoService.getLatestCommitOfBranch(
        sessionData,
        "master"
      )
      expect(actual).toEqual(expected)
    })
  })

  describe("updateRepoState", () => {
    it("should update the repo state on the local Git file system if the repo is ggs enabled", async () => {
      MockGitFileSystemService.updateRepoState.mockResolvedValueOnce(
        okAsync(undefined)
      )
      gbSpy.mockReturnValueOnce(true)

      await RepoService.updateRepoState(
        mockUserWithSiteSessionDataAndGrowthBook,
        {
          commitSha: "fake-sha",
          branchName: "master",
        }
      )

      expect(MockGitFileSystemService.updateRepoState).toBeCalledTimes(1)
    })

    it("should update the repo state on GitHub if the repo is not ggs enabled", async () => {
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })
      const gitHubServiceUpdateRepoState = jest.spyOn(
        GitHubService.prototype,
        "updateRepoState"
      )
      gitHubServiceUpdateRepoState.mockResolvedValueOnce(undefined)

      await RepoService.updateRepoState(sessionData, {
        commitSha: "fake-sha",
        branchName: "master",
      })

      expect(gitHubServiceUpdateRepoState).toBeCalledTimes(1)
    })
  })
})
