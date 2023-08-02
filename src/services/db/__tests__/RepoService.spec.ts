import { AxiosCacheInstance } from "axios-cache-interceptor"
import mock from "mock-fs"
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
import { GitDirectoryItem, GitFile } from "@root/types/gitfilesystem"
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
  listDirectoryContents: jest.fn(),
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
        },
        {
          name: "another-fake-file.md",
          type: "file",
          sha: "test-sha2",
          path: "another-fake-file.md",
        },
        {
          name: "fake-dir",
          type: "dir",
          sha: "test-sha3",
          path: "fake-dir",
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
        },
        {
          name: "another-fake-file.md",
          type: "file",
          sha: "test-sha2",
          path: "another-fake-file.md",
        },
        {
          name: "fake-dir",
          type: "dir",
          sha: "test-sha3",
          path: "fake-dir",
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
})
