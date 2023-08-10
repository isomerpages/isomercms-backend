import { AxiosCacheInstance } from "axios-cache-interceptor"
import { okAsync } from "neverthrow"

import {
  mockAccessToken,
  mockEmail,
  mockGithubId,
  mockIsomerUserId,
  mockSiteName,
  mockUserWithSiteSessionData,
} from "@fixtures/sessionData"
import UserWithSiteSessionData from "@root/classes/UserWithSiteSessionData"
import { GitHubCommitData } from "@root/types/commitData"
import { ItemType, MediaFileOutput, MediaDirOutput } from "@root/types"
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
  listDirectoryContents: jest.fn(),
  push: jest.fn(),
  read: jest.fn(),
  update: jest.fn(),
  getLatestCommitOfBranch: jest.fn(),
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

  describe("isRepoWhitelisted", () => {
    it("should indicate whitelisted repos as whitelisted correctly", () => {
      const actual1 = RepoService.isRepoWhitelisted("fake-repo")
      expect(actual1).toBe(true)

      const actual2 = RepoService.isRepoWhitelisted(mockSiteName)
      expect(actual2).toBe(true)
    })

    it("should indicate non-whitelisted repos as non-whitelisted correctly", () => {
      const actual = RepoService.isRepoWhitelisted("not-whitelisted")
      expect(actual).toBe(false)
    })
  })

  describe("read", () => {
    it("should read from the local Git file system if the repo is whitelisted", async () => {
      const expected: GitFile = {
        content: "test content",
        sha: "test-sha",
      }
      MockGitFileSystemService.read.mockResolvedValueOnce(okAsync(expected))

      const actual = await RepoService.read(mockUserWithSiteSessionData, {
        fileName: "test.md",
        directoryName: "",
      })

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
        mockUserWithSiteSessionData,
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

      const actual = await RepoService.update(mockUserWithSiteSessionData, {
        fileContent: "test content",
        sha: "fake-original-sha",
        fileName: "test.md",
        directoryName: "pages",
      })

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
        mockUserWithSiteSessionData,
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
        mockUserWithSiteSessionData,
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
        mockUserWithSiteSessionData,
        {
          readFromGithub: false,
          directoryInfo: {
            directoryName: "images",
          },
        }
      )

      expect(actual).toEqual(expected)
    })
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

    const getMediaFileInfo = jest
      .spyOn(mediaUtils, "getMediaFileInfo")
      .mockResolvedValueOnce(image)

    const actual = await RepoService.readMediaDirectory(sessionData, {
      readFromGithub: true,
      directoryInfo: {
        directoryName: "images",
        files: [
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
        ],
        mediaType: "string",
        isPrivate: false,
      },
    })

    expect(actual).toEqual(expected)
    expect(getMediaFileInfo).toBeCalledTimes(1)
  })
})
