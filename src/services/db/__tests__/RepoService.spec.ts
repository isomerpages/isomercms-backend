import { AxiosCacheInstance } from "axios-cache-interceptor"
import { okAsync } from "neverthrow"

import {
  mockAccessToken,
  mockEmail,
  mockGithubId,
  mockGithubSessionData,
  mockGrowthBook,
  mockIsomerUserId,
  mockSiteName,
  mockUserWithSiteSessionDataAndGrowthBook,
} from "@fixtures/sessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { ItemType, MediaFileOutput, MediaDirOutput } from "@root/types"
import { GitHubCommitData } from "@root/types/commitData"
import { GitDirectoryItem, GitFile } from "@root/types/gitfilesystem"
import * as mediaUtils from "@root/utils/media-utils"
import GitFileSystemService from "@services/db/GitFileSystemService"
import _RepoService from "@services/db/RepoService"

import { GitHubService } from "../GitHubService"

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
  push: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getLatestCommitOfBranch: jest.fn(),
  renameSinglePath: jest.fn(),
  moveFiles: jest.fn(),
}

const RepoService = new _RepoService(
  (MockAxiosInstance as unknown) as AxiosCacheInstance,
  (MockGitFileSystemService as unknown) as GitFileSystemService
)

describe("RepoService", () => {
  // Prevent inter-test pollution of mocks
  afterEach(() => {
    jest.clearAllMocks()
  })

  // load whitelisted sites into growthbook
  beforeAll(() => {
    mockGrowthBook.setFeatures({
      ggs_whitelisted_repos: {
        defaultValue: {
          repos: ["fake-repo", mockSiteName],
        },
      },
    })
  })

  describe("isRepoWhitelisted", () => {
    it("should indicate whitelisted repos as whitelisted correctly", () => {
      const actual1 = RepoService.isRepoWhitelisted(
        "fake-repo",
        mockUserWithSiteSessionDataAndGrowthBook
      )
      expect(actual1).toBe(true)

      const actual2 = RepoService.isRepoWhitelisted(
        mockSiteName,
        mockUserWithSiteSessionDataAndGrowthBook
      )
      expect(actual2).toBe(true)
    })

    it("should indicate non-whitelisted repos as non-whitelisted correctly", () => {
      const actual = RepoService.isRepoWhitelisted(
        "not-whitelisted",
        mockUserWithSiteSessionDataAndGrowthBook
      )
      expect(actual).toBe(false)
    })
  })

  describe("create", () => {
    it("should create using the local Git file system using utf-8 for non-media files if the repo is whitelisted", async () => {
      const returnedSha = "test-sha"
      const mockContent = "content"
      const mockFileName = "test.md"
      const mockDirectoryName = ""
      const createOutput = {
        newSha: returnedSha,
      }
      const expected = {
        sha: returnedSha,
      }
      MockGitFileSystemService.create.mockResolvedValueOnce(
        okAsync(createOutput)
      )

      const actual = await RepoService.create(
        mockUserWithSiteSessionDataAndGrowthBook,
        {
          content: mockContent,
          fileName: mockFileName,
          directoryName: mockDirectoryName,
          isMedia: false,
        }
      )

      expect(actual).toEqual(expected)
      expect(MockGitFileSystemService.create).toHaveBeenCalledWith(
        mockUserWithSiteSessionDataAndGrowthBook.siteName,
        mockUserWithSiteSessionDataAndGrowthBook.isomerUserId,
        mockContent,
        mockDirectoryName,
        mockFileName,
        "utf-8"
      )
    })

    it("should create using the local Git file system using base64 for media files if the repo is whitelisted", async () => {
      const returnedSha = "test-sha"
      const mockContent = "content"
      const mockFileName = "test.md"
      const mockDirectoryName = ""
      const createOutput = {
        newSha: returnedSha,
      }
      const expected = {
        sha: returnedSha,
      }
      MockGitFileSystemService.create.mockResolvedValueOnce(
        okAsync(createOutput)
      )

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
      expect(MockGitFileSystemService.create).toHaveBeenCalledWith(
        mockUserWithSiteSessionDataAndGrowthBook.siteName,
        mockUserWithSiteSessionDataAndGrowthBook.isomerUserId,
        mockContent,
        mockDirectoryName,
        mockFileName,
        "base64"
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
    it("should read from the local Git file system if the repo is whitelisted", async () => {
      const expected: GitFile = {
        content: "test content",
        sha: "test-sha",
      }
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

    it("should read from GitHub directly if the repo is not whitelisted", async () => {
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
      const gitHubServiceRead = jest.spyOn(GitHubService.prototype, "read")
      gitHubServiceRead.mockResolvedValueOnce(expected)

      const actual = await RepoService.read(sessionData, {
        fileName: "test.md",
        directoryName: "",
      })

      expect(actual).toEqual(expected)
    })
  })

  describe("readDirectory", () => {
    it("should read from the local Git file system if the repo is whitelisted", async () => {
      const expected: GitDirectoryItem[] = [
        {
          name: "fake-file.md",
          type: "file",
          sha: "test-sha1",
          path: "test/fake-file.md",
          size: 100,
        },
        {
          name: "another-fake-file.md",
          type: "file",
          sha: "test-sha2",
          path: "another-fake-file.md",
          size: 100,
        },
        {
          name: "fake-dir",
          type: "dir",
          sha: "test-sha3",
          path: "fake-dir",
          size: 0,
        },
      ]
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

    it("should read from GitHub directly if the repo is not whitelisted", async () => {
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
        },
        {
          name: "another-fake-file.md",
          type: "file",
          sha: "test-sha2",
          path: "another-fake-file.md",
          size: 100,
        },
        {
          name: "fake-dir",
          type: "dir",
          sha: "test-sha3",
          path: "fake-dir",
          size: 0,
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

  describe("update", () => {
    it("should update the local Git file system if the repo is whitelisted", async () => {
      const expectedSha = "fake-commit-sha"
      MockGitFileSystemService.update.mockResolvedValueOnce(
        okAsync(expectedSha)
      )
      MockGitFileSystemService.push.mockReturnValueOnce(undefined)

      const actual = await RepoService.update(
        mockUserWithSiteSessionDataAndGrowthBook,
        {
          fileContent: "test content",
          sha: "fake-original-sha",
          fileName: "test.md",
          directoryName: "pages",
        }
      )

      expect(actual).toEqual({ newSha: expectedSha })
    })

    it("should update GitHub directly if the repo is not whitelisted", async () => {
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

  describe("renameSinglePath", () => {
    it("should rename using the local Git file system if the repo is whitelisted", async () => {
      const expectedSha = "fake-commit-sha"
      MockGitFileSystemService.renameSinglePath.mockResolvedValueOnce(
        okAsync(expectedSha)
      )
      MockGitFileSystemService.push.mockReturnValueOnce(undefined)

      const actual = await RepoService.renameSinglePath(
        mockUserWithSiteSessionDataAndGrowthBook,
        mockGithubSessionData,
        "fake-old-path",
        "fake-new-path",
        "fake-commit-message"
      )

      expect(actual).toEqual({ newSha: expectedSha })
    })

    it("should rename file using GitHub directly if the repo is not whitelisted", async () => {
      const expectedSha = "fake-commit-sha"
      const fakeCommitMessage = "fake-commit-message"
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })
      const mockedTree = [
        {
          type: "file",
          path: "fake-path/old-fake-file.md",
          sha: "fake-original-sha",
        },
        {
          type: "tree",
          path: `fake-path`,
          sha: "sha1",
        },
      ]
      const expectedMovedTree = [
        {
          type: "file",
          path: "fake-path/new-fake-file.md",
          sha: "fake-original-sha",
        },
        {
          type: "file",
          path: "fake-path/old-fake-file.md",
          sha: null,
        },
      ]
      const gitHubServiceGetTree = jest.spyOn(
        GitHubService.prototype,
        "getTree"
      )
      gitHubServiceGetTree.mockResolvedValueOnce(mockedTree)
      const gitHubServiceUpdateTree = jest.spyOn(
        GitHubService.prototype,
        "updateTree"
      )
      gitHubServiceUpdateTree.mockResolvedValueOnce(expectedSha)
      const gitHubServiceUpdateRepoState = jest.spyOn(
        GitHubService.prototype,
        "updateRepoState"
      )
      gitHubServiceUpdateRepoState.mockResolvedValueOnce(undefined)

      const actual = await RepoService.renameSinglePath(
        sessionData,
        mockGithubSessionData,
        "fake-path/old-fake-file.md",
        "fake-path/new-fake-file.md",
        fakeCommitMessage
      )

      expect(actual).toEqual({ newSha: expectedSha })
      expect(gitHubServiceUpdateTree).toHaveBeenCalledWith(
        sessionData,
        mockGithubSessionData,
        { gitTree: expectedMovedTree, message: fakeCommitMessage }
      )
    })
  })

  describe("moveFiles", () => {
    it("should move files using the Git local file system if the repo is whitelisted", async () => {
      const expectedSha = "fake-commit-sha"
      MockGitFileSystemService.moveFiles.mockResolvedValueOnce(
        okAsync(expectedSha)
      )
      MockGitFileSystemService.push.mockReturnValueOnce(undefined)

      const actual = await RepoService.moveFiles(
        mockUserWithSiteSessionDataAndGrowthBook,
        mockGithubSessionData,
        "fake-old-path",
        "fake-new-path",
        ["fake-file1", "fake-file2"],
        "fake-commit-message"
      )

      expect(actual).toEqual({ newSha: expectedSha })
    })

    it("should move files using GitHub directly if the repo is not whitelisted", async () => {
      const expectedSha = "fake-commit-sha"
      const fakeCommitMessage = "fake-commit-message"
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })
      const mockedTree = [
        {
          type: "file",
          path: "fake-path/old-fake-file.md",
          sha: "fake-original-sha",
        },
        {
          type: "file",
          path: `fake-path/old-fake-file-two.md`,
          sha: "fake-original-sha-two",
        },
      ]
      const expectedMovedTree = [
        {
          type: "file",
          path: "fake-new-path/old-fake-file.md",
          sha: "fake-original-sha",
        },
        {
          type: "file",
          path: "fake-path/old-fake-file.md",
          sha: null,
        },
        {
          type: "file",
          path: "fake-new-path/old-fake-file-two.md",
          sha: "fake-original-sha-two",
        },
        {
          type: "file",
          path: `fake-path/old-fake-file-two.md`,
          sha: null,
        },
      ]
      const gitHubServiceGetTree = jest.spyOn(
        GitHubService.prototype,
        "getTree"
      )
      gitHubServiceGetTree.mockResolvedValueOnce(mockedTree)
      const gitHubServiceUpdateTree = jest.spyOn(
        GitHubService.prototype,
        "updateTree"
      )
      gitHubServiceUpdateTree.mockResolvedValueOnce(expectedSha)
      const gitHubServiceUpdateRepoState = jest.spyOn(
        GitHubService.prototype,
        "updateRepoState"
      )
      gitHubServiceUpdateRepoState.mockResolvedValueOnce(undefined)

      const actual = await RepoService.moveFiles(
        sessionData,
        mockGithubSessionData,
        "fake-path",
        "fake-new-path",
        ["old-fake-file.md", "old-fake-file-two.md"],
        fakeCommitMessage
      )

      expect(actual).toEqual({ newSha: expectedSha })
      expect(gitHubServiceUpdateTree).toHaveBeenCalledWith(
        sessionData,
        mockGithubSessionData,
        { gitTree: expectedMovedTree, message: fakeCommitMessage }
      )
    })
  })

  describe("getLatestCommitOfBranch", () => {
    it("should read the latest commit data from the local Git file system if the repo is whitelisted", async () => {
      const expected: GitHubCommitData = {
        author: {
          name: "test author",
          email: "test@email.com",
          date: "2023-07-20T11:25:05+08:00",
        },
        sha: "test-sha",
        message: "test message",
      }
      MockGitFileSystemService.getLatestCommitOfBranch.mockResolvedValueOnce(
        okAsync(expected)
      )

      const actual = await RepoService.getLatestCommitOfBranch(
        mockUserWithSiteSessionDataAndGrowthBook,
        "master"
      )
      expect(actual).toEqual(expected)
    })

    it("should read latest commit data from GitHub if the repo is not whitelisted", async () => {
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

  describe("readMediaFile", () => {
    it("should read image from the local Git file system for whitelisted repos", async () => {
      const expected: MediaFileOutput = {
        name: "test content",
        sha: "test-sha",
        mediaUrl: "sampleBase64Img",
        mediaPath: "images/test-img.jpeg",
        type: "image" as ItemType,
      }
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

    it("should read image from GitHub for whitelisted repos", async () => {
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
      }

      const gitHubServiceReadDirectory = jest.spyOn(
        GitHubService.prototype,
        "readDirectory"
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
      gitHubServiceGetRepoInfo.mockResolvedValueOnce({ private: false })
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

  describe("readMediaDirectory", () => {
    it("should return an array of files and directories from disk if repo is whitelisted", async () => {
      const image: MediaFileOutput = {
        name: "image-name",
        sha: "test-sha",
        mediaUrl: "base64ofimage",
        mediaPath: "images/image-name.jpg",
        type: "file",
      }
      const dir: MediaDirOutput = {
        name: "imageDir",
        type: "dir",
      }
      const expected = [image, dir]
      MockGitFileSystemService.listDirectoryContents.mockResolvedValueOnce(
        okAsync([
          {
            name: "image-name",
            type: "file",
            sha: "test-sha",
            path: "images/image-name.jpg",
          },
          {
            name: "imageDir",
            type: "dir",
            sha: "test-sha",
            path: "images/imageDir",
          },
          {
            name: ".keep",
            type: "file",
            sha: "test-sha",
            path: "images/.keep",
          },
        ])
      )
      MockGitFileSystemService.readMediaFile.mockResolvedValueOnce(
        okAsync(image)
      )

      const actual = await RepoService.readMediaDirectory(
        mockUserWithSiteSessionDataAndGrowthBook,
        "images"
      )

      expect(actual).toEqual(expected)
    })

    it("should return an array of files and directories from GitHub if repo is not whitelisted", async () => {
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })

      const image: MediaFileOutput = {
        name: "image-name",
        sha: "test-sha",
        mediaUrl: "base64ofimage",
        mediaPath: "images/image-name.jpg",
        type: "file",
      }
      const dir: MediaDirOutput = {
        name: "imageDir",
        type: "dir",
      }
      const expected = [image, dir]

      const gitHubServiceGetRepoInfo = jest
        .spyOn(GitHubService.prototype, "getRepoInfo")
        .mockResolvedValueOnce({ private: false })
      const gitHubServiceReadDirectory = jest
        .spyOn(GitHubService.prototype, "readDirectory")
        .mockResolvedValueOnce([
          {
            name: "image-name",
            type: "file",
            sha: "test-sha",
            path: "images/image-name.jpg",
          },
          {
            name: "imageDir",
            type: "dir",
            sha: "test-sha",
            path: "images/imageDir",
          },
          {
            name: ".keep",
            type: "file",
            sha: "test-sha",
            path: "images/.keep",
          },
        ])

      const repoServiceReadMediaFile = jest
        .spyOn(_RepoService.prototype, "readMediaFile")
        .mockResolvedValueOnce(image)

      const actual = await RepoService.readMediaDirectory(sessionData, "images")

      expect(actual).toEqual(expected)
      expect(gitHubServiceGetRepoInfo).toBeCalledTimes(1)
      expect(gitHubServiceReadDirectory).toBeCalledTimes(1)
      expect(repoServiceReadMediaFile).toBeCalledTimes(1)
    })
  })

  describe("delete", () => {
    it("should delete a file from Git file system when repo is whitelisted", async () => {
      MockGitFileSystemService.delete.mockResolvedValueOnce(
        okAsync("some-fake-sha")
      )

      await RepoService.delete(mockUserWithSiteSessionDataAndGrowthBook, {
        sha: "fake-original-sha",
        fileName: "test.md",
        directoryName: "pages",
      })

      expect(MockGitFileSystemService.delete).toBeCalledTimes(1)
      expect(MockGitFileSystemService.delete).toBeCalledWith(
        mockUserWithSiteSessionDataAndGrowthBook.siteName,
        "pages/test.md",
        "fake-original-sha",
        mockUserWithSiteSessionDataAndGrowthBook.isomerUserId,
        false
      )
      expect(MockGitFileSystemService.push).toBeCalledTimes(1)
      expect(MockGitFileSystemService.push).toBeCalledWith(
        mockUserWithSiteSessionDataAndGrowthBook.siteName
      )
    })

    it("should delete a file from GitHub when repo is not whitelisted", async () => {
      const sessionData: UserWithSiteSessionData = new UserWithSiteSessionData({
        githubId: mockGithubId,
        accessToken: mockAccessToken,
        isomerUserId: mockIsomerUserId,
        email: mockEmail,
        siteName: "not-whitelisted",
      })

      const gitHubServiceDelete = jest.spyOn(GitHubService.prototype, "delete")

      await RepoService.delete(sessionData, {
        sha: "fake-original-sha",
        fileName: "test.md",
        directoryName: "pages",
      })

      expect(gitHubServiceDelete).toBeCalledTimes(1)
      expect(gitHubServiceDelete).toBeCalledWith(sessionData, {
        sha: "fake-original-sha",
        fileName: "test.md",
        directoryName: "pages",
      })
    })
  })
})
