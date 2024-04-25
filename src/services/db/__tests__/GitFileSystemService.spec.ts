import fs, { Stats } from "fs"

import mockFs from "mock-fs"
import { okAsync } from "neverthrow"
import { GitError, SimpleGit } from "simple-git"

import config from "@config/config"

import { BadRequestError } from "@errors/BadRequestError"
import { ConflictError } from "@errors/ConflictError"
import GitFileSystemError from "@errors/GitFileSystemError"
import GitFileSystemNeedsRollbackError from "@errors/GitFileSystemNeedsRollbackError"
import { NotFoundError } from "@errors/NotFoundError"

import {
  EFS_VOL_PATH_STAGING,
  EFS_VOL_PATH_STAGING_LITE,
  ISOMER_GITHUB_ORG_NAME,
} from "@constants/constants"

import {
  MOCK_GITHUB_FILENAME_ALPHA_ONE,
  MOCK_GITHUB_COMMIT_MESSAGE_ALPHA_ONE,
} from "@fixtures/github"
import { MOCK_USER_ID_ONE } from "@fixtures/users"
import { MediaTypeError } from "@root/errors/MediaTypeError"
import { MOCK_LATEST_LOG_ONE } from "@root/fixtures/review"
import { MediaFileOutput } from "@root/types"
import { GitHubCommitData } from "@root/types/commitData"
import { GitDirectoryItem, GitFile } from "@root/types/gitfilesystem"
import _GitFileSystemService from "@services/db/GitFileSystemService"

const MockSimpleGit = {
  clone: jest.fn(),
  cwd: jest.fn(),
}

const GitFileSystemService = new _GitFileSystemService(
  (MockSimpleGit as unknown) as SimpleGit
)

const BRANCH_REF = config.get("github.branchRef")
const DEFAULT_BRANCH = "staging"

const dirTree = {
  "fake-repo": {
    "fake-dir": {
      "fake-file": "fake content",
      "fake-media-file.png": "fake media content",
    },
    "another-fake-dir": {
      "fake-file": "duplicate fake file",
    },
    "fake-empty-dir": {},
    "another-fake-file": "Another fake content",
  },
}

const dirTreeWithIgnoredFiles = {
  ...dirTree,
  ".git": "fake git directory",
}

describe("GitFileSystemService", () => {
  beforeEach(() => {
    mockFs({
      [EFS_VOL_PATH_STAGING]: dirTree,
      [EFS_VOL_PATH_STAGING_LITE]: dirTree,
    })
  })

  // Prevent inter-test pollution of mocks
  afterEach(() => {
    jest.clearAllMocks()
    mockFs.restore()
  })

  describe("listDirectoryContents", () => {
    it("should return the contents of a directory successfully", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("another-fake-dir-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("another-fake-file-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-dir-hash"),
      })

      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-empty-dir-hash"),
      })

      const expectedFakeDir: GitDirectoryItem = {
        name: "fake-dir",
        type: "dir",
        path: "fake-dir",
        size: 0,
        sha: "fake-dir-hash",
        addedTime: fs.statSync(`${EFS_VOL_PATH_STAGING}/fake-repo/fake-dir`)
          .ctimeMs,
      }
      const expectedAnotherFakeDir: GitDirectoryItem = {
        name: "another-fake-dir",
        type: "dir",
        path: "another-fake-dir",
        size: 0,
        sha: "another-fake-dir-hash",
        addedTime: fs.statSync(
          `${EFS_VOL_PATH_STAGING}/fake-repo/another-fake-dir`
        ).ctimeMs,
      }
      const expectedFakeEmptyDir: GitDirectoryItem = {
        name: "fake-empty-dir",
        type: "dir",
        path: "fake-empty-dir",
        size: 0,
        sha: "fake-empty-dir-hash",
        addedTime: fs.statSync(
          `${EFS_VOL_PATH_STAGING}/fake-repo/fake-empty-dir`
        ).ctimeMs,
      }
      const expectedAnotherFakeFile: GitDirectoryItem = {
        name: "another-fake-file",
        type: "file",
        path: "another-fake-file",
        size: "Another fake content".length,
        sha: "another-fake-file-hash",
        addedTime: fs.statSync(
          `${EFS_VOL_PATH_STAGING}/fake-repo/another-fake-file`
        ).ctimeMs,
      }

      const result = await GitFileSystemService.listDirectoryContents(
        "fake-repo",
        "",
        DEFAULT_BRANCH
      )
      const actual = result
        ._unsafeUnwrap()
        .sort((a, b) => a.name.localeCompare(b.name))

      expect(actual).toMatchObject([
        expectedAnotherFakeDir,
        expectedAnotherFakeFile,
        expectedFakeDir,
        expectedFakeEmptyDir,
      ])
    })

    it("should return an empty result if the directory is empty", async () => {
      const result = await GitFileSystemService.listDirectoryContents(
        "fake-repo",
        "fake-empty-dir",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrap()).toHaveLength(0)
    })

    it("should return a GitFileSystemError if the path is not a directory", async () => {
      const result = await GitFileSystemService.listDirectoryContents(
        "fake-repo",
        "fake-dir/fake-file",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a NotFoundError if the path does not exist", async () => {
      const result = await GitFileSystemService.listDirectoryContents(
        "fake-repo",
        "non-existent-dir",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError)
    })

    it("should ignore .git folder", async () => {
      mockFs({
        [EFS_VOL_PATH_STAGING]: dirTreeWithIgnoredFiles,
      })
      const result = await GitFileSystemService.listDirectoryContents(
        "fake-repo",
        "fake-empty-dir",
        DEFAULT_BRANCH
      )
      expect(result._unsafeUnwrap()).toHaveLength(0)
    })
  })

  describe("listPaginatedDirectoryContents", () => {
    it("should return the contents of a directory successfully", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("another-fake-dir-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-dir-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-empty-dir-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("another-fake-file-hash"),
      })

      const expectedFakeDir: GitDirectoryItem = {
        name: "fake-dir",
        type: "dir",
        sha: "fake-dir-hash",
        path: "fake-dir",
        size: 0,
        addedTime: fs.statSync(`${EFS_VOL_PATH_STAGING}/fake-repo/fake-dir`)
          .ctimeMs,
      }
      const expectedAnotherFakeDir: GitDirectoryItem = {
        name: "another-fake-dir",
        type: "dir",
        sha: "another-fake-dir-hash",
        path: "another-fake-dir",
        size: 0,
        addedTime: fs.statSync(
          `${EFS_VOL_PATH_STAGING}/fake-repo/another-fake-dir`
        ).ctimeMs,
      }
      const expectedFakeEmptyDir: GitDirectoryItem = {
        name: "fake-empty-dir",
        type: "dir",
        sha: "fake-empty-dir-hash",
        path: "fake-empty-dir",
        size: 0,
        addedTime: fs.statSync(
          `${EFS_VOL_PATH_STAGING}/fake-repo/fake-empty-dir`
        ).ctimeMs,
      }
      const expectedAnotherFakeFile: GitDirectoryItem = {
        name: "another-fake-file",
        type: "file",
        sha: "another-fake-file-hash",
        path: "another-fake-file",
        size: "Another fake content".length,
        addedTime: fs.statSync(
          `${EFS_VOL_PATH_STAGING}/fake-repo/another-fake-file`
        ).ctimeMs,
      }

      const result = await GitFileSystemService.listPaginatedDirectoryContents(
        "fake-repo",
        "",
        DEFAULT_BRANCH
      )
      const actual = [
        ...result._unsafeUnwrap().directories,
        ...result._unsafeUnwrap().files,
      ].sort((a, b) => a.name.localeCompare(b.name))

      expect(actual).toMatchObject([
        expectedAnotherFakeDir,
        expectedAnotherFakeFile,
        expectedFakeDir,
        expectedFakeEmptyDir,
      ])
    })

    it("should return only results of files that are tracked by Git", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-empty-dir-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("another-fake-file-hash"),
      })

      const expectedFakeDir: GitDirectoryItem = {
        name: "fake-empty-dir",
        type: "dir",
        sha: "fake-empty-dir-hash",
        path: "fake-empty-dir",
        size: 0,
        addedTime: fs.statSync(`${EFS_VOL_PATH_STAGING}/fake-repo/fake-dir`)
          .ctimeMs,
      }
      const expectedAnotherFakeFile: GitDirectoryItem = {
        name: "another-fake-file",
        type: "file",
        sha: "another-fake-file-hash",
        path: "another-fake-file",
        size: "Another fake content".length,
        addedTime: fs.statSync(
          `${EFS_VOL_PATH_STAGING}/fake-repo/another-fake-file`
        ).ctimeMs,
      }

      const result = await GitFileSystemService.listPaginatedDirectoryContents(
        "fake-repo",
        "",
        DEFAULT_BRANCH
      )

      const actual = [
        ...result._unsafeUnwrap().directories,
        ...result._unsafeUnwrap().files,
      ].sort((a, b) => a.name.localeCompare(b.name))

      expect(actual).toMatchObject([expectedAnotherFakeFile, expectedFakeDir])
    })

    it("should return an empty result if the directory contain files that are all untracked", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.listPaginatedDirectoryContents(
        "fake-repo",
        "",
        DEFAULT_BRANCH
      )

      const actual = [
        ...result._unsafeUnwrap().directories,
        ...result._unsafeUnwrap().files,
      ]

      expect(actual).toHaveLength(0)
    })

    it("should return an empty result if the directory is empty", async () => {
      const result = await GitFileSystemService.listPaginatedDirectoryContents(
        "fake-repo",
        "fake-empty-dir",
        DEFAULT_BRANCH
      )

      const actual = [
        ...result._unsafeUnwrap().directories,
        ...result._unsafeUnwrap().files,
      ]

      expect(actual).toHaveLength(0)
    })

    it("should return a GitFileSystemError if the path is not a directory", async () => {
      const result = await GitFileSystemService.listPaginatedDirectoryContents(
        "fake-repo",
        "fake-dir/fake-file",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a NotFoundError if the path does not exist", async () => {
      const result = await GitFileSystemService.listPaginatedDirectoryContents(
        "fake-repo",
        "non-existent-dir",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError)
    })
  })

  describe("isGitInitialized", () => {
    it("should mark a valid Git repo as initialized", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })

      const result = await GitFileSystemService.isGitInitialized(
        "fake-repo",
        true
      )

      expect(result._unsafeUnwrap()).toBeTrue()
    })

    it("should mark a non-Git folder as not initialized", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(false),
      })

      const result = await GitFileSystemService.isGitInitialized(
        "fake-repo",
        true
      )

      expect(result._unsafeUnwrap()).toBeFalse()
    })

    it("should return a GitFileSystemError if a Git error occurs", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.isValidGitRepo(
        "fake-repo",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("isOriginRemoteCorrect", () => {
    it("should mark a valid Git repo with the correct remote as correct", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })

      const result = await GitFileSystemService.isOriginRemoteCorrect(
        "fake-repo",
        true
      )

      expect(result._unsafeUnwrap()).toBeTrue()
    })

    it("should mark a valid Git repo with the incorrect remote as incorrect", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/another-fake-repo.git`
          ),
      })

      const result = await GitFileSystemService.isOriginRemoteCorrect(
        "fake-repo",
        true
      )

      expect(result._unsafeUnwrap()).toBeFalse()
    })

    it("should return a GitFileSystemError if a Git error occurs", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.isOriginRemoteCorrect(
        "fake-repo",
        true
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("isValidGitRepo", () => {
    it("should mark a valid Git repo as valid", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })

      const result = await GitFileSystemService.isValidGitRepo(
        "fake-repo",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrap()).toBeTrue()
    })

    it("should mark a Git repo with no remote as invalid", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest.fn().mockResolvedValueOnce(null),
      })

      const result = await GitFileSystemService.isValidGitRepo(
        "fake-repo",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrap()).toBeFalse()
    })

    it("should mark a Git repo with an incorrect remote as invalid", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/another-fake-repo.git`
          ),
      })

      const result = await GitFileSystemService.isValidGitRepo(
        "fake-repo",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrap()).toBeFalse()
    })

    it("should mark a non-Git folder as invalid", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(false),
      })

      const result = await GitFileSystemService.isValidGitRepo(
        "fake-repo",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrap()).toBeFalse()
    })

    it("should mark a non-existent folder as invalid", async () => {
      const result = await GitFileSystemService.isValidGitRepo(
        "non-existent",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrap()).toBeFalse()
    })

    it("should return a GitFileSystemError if a Git error occurs", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.isValidGitRepo(
        "fake-repo",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("ensureCorrectBranch", () => {
    it("should perform a branch change if the current branch is not the desired branch", async () => {
      const revparseMock = jest.fn().mockResolvedValueOnce("incorrect-branch")
      const checkoutMock = jest.fn().mockResolvedValueOnce(undefined)
      const anotherBranchRef = "another-branch-ref"

      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: revparseMock,
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkout: checkoutMock,
      })

      const result = await GitFileSystemService.ensureCorrectBranch(
        "fake-repo",
        anotherBranchRef
      )

      expect(revparseMock).toHaveBeenCalledWith(["--abbrev-ref", "HEAD"])
      expect(checkoutMock).toHaveBeenCalledWith(anotherBranchRef)
      expect(result._unsafeUnwrap()).toBeTrue()
    })

    it("should perform a branch change if the current branch is not the default branch", async () => {
      const revparseMock = jest.fn().mockResolvedValueOnce("incorrect-branch")
      const checkoutMock = jest.fn().mockResolvedValueOnce(undefined)

      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: revparseMock,
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkout: checkoutMock,
      })

      const result = await GitFileSystemService.ensureCorrectBranch(
        "fake-repo",
        BRANCH_REF
      )

      expect(revparseMock).toHaveBeenCalledWith(["--abbrev-ref", "HEAD"])
      expect(checkoutMock).toHaveBeenCalledWith(BRANCH_REF)
      expect(result._unsafeUnwrap()).toBeTrue()
    })

    it("should not perform a branch change if the current branch is the correct branch", async () => {
      const revparseMock = jest.fn().mockResolvedValueOnce(BRANCH_REF)

      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: revparseMock,
      })

      const result = await GitFileSystemService.ensureCorrectBranch(
        "fake-repo",
        BRANCH_REF
      )

      expect(revparseMock).toHaveBeenCalledWith(["--abbrev-ref", "HEAD"])
      expect(MockSimpleGit.cwd).toHaveBeenCalledTimes(1)
      expect(result._unsafeUnwrap()).toBeTrue()
    })

    it("should return an error if an error occurred when checking the current branch", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.ensureCorrectBranch(
        "fake-repo",
        BRANCH_REF
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return an error if an error occurred when changing the branch", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("incorrect-branch"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkout: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.ensureCorrectBranch(
        "fake-repo",
        BRANCH_REF
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("getGitBlobHash", () => {
    it("should return the correct hash for a tracked file", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-hash"),
      })

      const result = await GitFileSystemService.getGitBlobHash(
        "fake-repo",
        "fake-dir/fake-file",
        true
      )

      expect(result._unsafeUnwrap()).toBe("fake-hash")
    })

    it("should return an error for an untracked file", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.getGitBlobHash(
        "fake-repo",
        "fake-dir/fake-file",
        true
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return not found error for a non-existent file", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest
          .fn()
          .mockRejectedValueOnce(
            new GitError(
              undefined,
              `fatal: path //fake-media-file.png exists on disk, but not in 'HEAD'`
            )
          ),
      })
      const result = await GitFileSystemService.getGitBlobHash(
        "fake-repo",
        "fake-dir/%2ffake-media-file.png",
        true
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError)
    })
  })

  describe("getFilePathStats", () => {
    it("should return the filesystem stats for a valid file", async () => {
      const result = await GitFileSystemService.getFilePathStats(
        "fake-repo",
        "fake-dir/fake-file",
        DEFAULT_BRANCH === "staging"
      )

      expect(result._unsafeUnwrap().isFile()).toBeTrue()
    })

    it("should return the filesystem stats for a valid directory", async () => {
      const result = await GitFileSystemService.getFilePathStats(
        "fake-repo",
        "fake-empty-dir",
        DEFAULT_BRANCH === "staging"
      )

      expect(result._unsafeUnwrap().isDirectory()).toBeTrue()
    })

    it("should return a NotFoundError for a non-existent path", async () => {
      const result = await GitFileSystemService.getFilePathStats(
        "fake-repo",
        "non-existent",
        DEFAULT_BRANCH === "staging"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError)
    })
  })

  describe("getFilesChanged", () => {
    const spyCreateLocalTrackingBranchIfNotExists = jest.spyOn(
      GitFileSystemService,
      "createLocalTrackingBranchIfNotExists"
    )
    const mockCreateLocalTrackingBranchIfNotExists = jest
      .fn()
      .mockReturnValue(okAsync(true))

    beforeAll(() => {
      spyCreateLocalTrackingBranchIfNotExists.mockImplementation(
        mockCreateLocalTrackingBranchIfNotExists
      )
    })

    afterAll(() => {
      spyCreateLocalTrackingBranchIfNotExists.mockRestore()
    })

    it("should return the files changed and defensively try creating local branches", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        raw: jest
          .fn()
          .mockResolvedValueOnce("fake-dir/fake-file\nanother-fake-file\n"),
      })

      const expected = ["fake-dir/fake-file", "another-fake-file"]

      const actual = await GitFileSystemService.getFilesChanged("fake-repo")

      expect(actual._unsafeUnwrap()).toEqual(expected)
      expect(mockCreateLocalTrackingBranchIfNotExists).toHaveBeenCalled()
    })

    it("should return GitFileSystemError if an error occurred when getting the git diff", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        raw: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const actual = await GitFileSystemService.getFilesChanged("fake-repo")

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("getLatestLocalCommitOfPath", () => {
    it("should return the latest commit for a valid path", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: MOCK_LATEST_LOG_ONE,
        }),
      })

      const result = await GitFileSystemService.getLatestCommitOfPath(
        "fake-repo",
        "fake-dir/fake-file"
      )

      expect(result._unsafeUnwrap()).toEqual(MOCK_LATEST_LOG_ONE)
    })

    it("should return GitFileSystemError if an error occurred when getting the git log", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.getLatestCommitOfPath(
        "fake-repo",
        "fake-dir/fake-file"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return GitFileSystemError if there were no commits found", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({ latest: null }),
      })

      const result = await GitFileSystemService.getLatestCommitOfPath(
        "fake-repo",
        "fake-dir/fake-file"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("getGitLog", () => {
    it("should return the Git log for a valid branch", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce(undefined),
      })

      const result = await GitFileSystemService.getGitLog(
        "fake-repo",
        "fake-commit-sha"
      )

      expect(result.isOk()).toBeTrue()
    })

    it("should return GitFileSystemError if an error occurred when getting the Git log", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.getGitLog(
        "fake-repo",
        "fake-commit-sha"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return GitFileSystemError if maxCount is supplied as a float", async () => {
      const result = await GitFileSystemService.getGitLog(
        "fake-repo",
        "fake-commit-sha",
        1.1 // float value
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return GitFileSystemError if a maxCount less than 1 is supplied", async () => {
      const result1 = await GitFileSystemService.getGitLog(
        "fake-repo",
        "fake-commit-sha",
        0
      )

      expect(result1._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)

      const result2 = await GitFileSystemService.getGitLog(
        "fake-repo",
        "fake-commit-sha",
        -1
      )

      expect(result2._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("rollback", () => {
    it("should rollback successfully for a valid Git repo", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        reset: jest.fn().mockReturnValueOnce({
          clean: jest.fn().mockResolvedValueOnce(undefined),
        }),
      })

      const result = await GitFileSystemService.rollback(
        "fake-repo",
        "fake-commit-sha",
        "staging"
      )

      expect(result.isOk()).toBeTrue()
    })

    it("should return a GitFileSystemError if a Git error occurs when rolling back", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        reset: jest.fn().mockReturnValueOnce({
          clean: jest.fn().mockRejectedValueOnce(new GitError()),
        }),
      })

      const result = await GitFileSystemService.rollback(
        "fake-repo",
        "fake-commit-sha",
        "staging"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("clone", () => {
    it("should clone a Git repo if it does not already exist", async () => {
      MockSimpleGit.clone.mockReturnValueOnce({
        cwd: jest.fn().mockReturnValueOnce({
          checkout: jest.fn().mockResolvedValueOnce(undefined),
        }),
      })
      MockSimpleGit.clone.mockReturnValueOnce({
        cwd: jest.fn().mockResolvedValueOnce({}),
      })
      const result = await GitFileSystemService.clone("new-fake-repo")
      expect(result.isOk()).toBeTrue()
    })

    it("should do nothing if a valid Git repo already exists", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })

      const result = await GitFileSystemService.clone("fake-repo")

      expect(result.isOk()).toBeTrue()
    })

    it("should return a GitFileSystemError if an existing folder exists but does not have a valid remote", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/another-fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/another-fake-repo.git`
          ),
      })

      const result = await GitFileSystemService.clone("fake-repo")

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a GitFileSystemError if an existing folder exists but is not a Git repo", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(false),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(false),
      })

      const result = await GitFileSystemService.clone("fake-repo")

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a GitFileSystemError if a Git error occurs", async () => {
      MockSimpleGit.clone.mockReturnValueOnce({
        cwd: jest.fn().mockReturnValueOnce({
          checkout: jest.fn().mockRejectedValueOnce(new GitError()),
        }),
      })
      MockSimpleGit.clone.mockReturnValueOnce({
        cwd: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.clone("anothers-fake-repo")

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("pull", () => {
    it("should pull successfully for a valid Git repo", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        pull: jest.fn().mockResolvedValueOnce(undefined),
      })

      const result = await GitFileSystemService.pull(
        "fake-repo",
        DEFAULT_BRANCH
      )

      expect(result.isOk()).toBeTrue()
    })

    it("should return a GitFileSystemError if a Git error occurs when pulling", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        pull: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.pull(
        "fake-repo",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a GitFileSystemError if an existing folder exists but is not a valid Git repo", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(false),
      })

      const result = await GitFileSystemService.pull(
        "fake-repo",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("push", () => {
    it("should push successfully for a valid Git repo", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        push: jest.fn().mockResolvedValueOnce(undefined),
      })

      const result = await GitFileSystemService.push("fake-repo", BRANCH_REF)

      expect(result.isOk()).toBeTrue()
    })

    it("should push successfully for a valid Git repo with a non-standard branch ref", async () => {
      const nonStandardBranchRef = "non-standard-branch-ref"
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(nonStandardBranchRef),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        push: jest.fn().mockResolvedValueOnce(undefined),
      })

      const result = await GitFileSystemService.push(
        "fake-repo",
        nonStandardBranchRef
      )

      expect(result.isOk()).toBeTrue()
    })

    it("should retry pushing once if a Git error occurs when pushing the first time", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        push: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        push: jest.fn().mockResolvedValueOnce(undefined),
      })

      const result = await GitFileSystemService.push("fake-repo", BRANCH_REF)

      expect(result.isOk()).toBeTrue()
    })

    it("should return a GitFileSystemError if a Git error occurs when pushing", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        push: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        push: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        push: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.push("fake-repo", BRANCH_REF)

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a GitFileSystemError if an existing folder exists but is not a valid Git repo", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(false),
      })

      const result = await GitFileSystemService.push("fake-repo", BRANCH_REF)

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("commit", () => {
    it("should commit successfully for a valid Git repo and with valid inputs", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      const mockCommitSha = "fake-commit-sha"
      const mockCommitFn = jest
        .fn()
        .mockResolvedValueOnce({ commit: mockCommitSha })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: mockCommitFn,
      })

      const fakePath = `fake-dir/${MOCK_GITHUB_FILENAME_ALPHA_ONE}`
      const expectedCommitMessage = JSON.stringify({
        message: MOCK_GITHUB_COMMIT_MESSAGE_ALPHA_ONE,
        userId: MOCK_USER_ID_ONE.toString(),
        fileName: MOCK_GITHUB_FILENAME_ALPHA_ONE,
      })

      const result = await GitFileSystemService.commit(
        "fake-repo",
        [fakePath],
        MOCK_USER_ID_ONE.toString(),
        MOCK_GITHUB_COMMIT_MESSAGE_ALPHA_ONE,
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrap()).toBe(mockCommitSha)
      expect(mockCommitFn).toHaveBeenCalledWith(expectedCommitMessage)
    })

    it("should commit successfully without adding files if skipGitAdd was set to true", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      const mockCommitSha = "fake-commit-sha"
      const mockCommitFn = jest
        .fn()
        .mockResolvedValueOnce({ commit: mockCommitSha })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: mockCommitFn,
      })

      const fakePath = `fake-dir/${MOCK_GITHUB_FILENAME_ALPHA_ONE}`
      const expectedCommitMessage = JSON.stringify({
        message: MOCK_GITHUB_COMMIT_MESSAGE_ALPHA_ONE,
        userId: MOCK_USER_ID_ONE.toString(),
        fileName: MOCK_GITHUB_FILENAME_ALPHA_ONE,
      })

      const result = await GitFileSystemService.commit(
        "fake-repo",
        [fakePath],
        MOCK_USER_ID_ONE.toString(),
        MOCK_GITHUB_COMMIT_MESSAGE_ALPHA_ONE,
        DEFAULT_BRANCH,
        true
      )

      expect(result._unsafeUnwrap()).toBe(mockCommitSha)
      expect(mockCommitFn).toHaveBeenCalledWith(expectedCommitMessage)
      expect(MockSimpleGit.cwd).toHaveBeenCalledTimes(4)
    })

    it("should return a GitFileSystemNeedsRollbackError if a Git error occurs when committing", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.commit(
        "fake-repo",
        ["fake-dir/fake-file"],
        "fake-hash",
        "fake message",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(
        GitFileSystemNeedsRollbackError
      )
    })

    it("should return a GitFileSystemNeedsRollbackError if a Git error occurs when adding files", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.commit(
        "fake-repo",
        ["fake-dir/fake-file"],
        "fake-hash",
        "fake message",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(
        GitFileSystemNeedsRollbackError
      )
    })

    it("should return a GitFileSystemError if no pathspecs were provided", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })

      const result = await GitFileSystemService.commit(
        "fake-repo",
        [],
        "fake-hash",
        "fake message",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a GitFileSystemError if an existing folder exists but is not a valid Git repo", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(false),
      })

      const result = await GitFileSystemService.commit(
        "fake-repo",
        ["one", "two", "fake-dir/three"],
        "fake-hash",
        "fake message",
        DEFAULT_BRANCH
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("create", () => {
    it("should create a non-media file successfully", async () => {
      const expectedSha = "fake-hash"

      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            author_name: "fake-author",
            author_email: "fake-email",
            date: "fake-date",
            message: "fake-message",
            hash: "test-commit-sha",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkout: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockResolvedValueOnce({ commit: expectedSha }),
      })

      const expected = {
        newSha: expectedSha,
      }
      const actual = await GitFileSystemService.create(
        "fake-repo",
        "fake-user-id",
        "fake content",
        "fake-dir",
        "create-file",
        "utf-8",
        DEFAULT_BRANCH
      )

      expect(actual._unsafeUnwrap()).toEqual(expected)
    })

    it("should create a media file successfully", async () => {
      const expectedSha = "fake-hash"

      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            author_name: "fake-author",
            author_email: "fake-email",
            date: "fake-date",
            message: "fake-message",
            hash: "test-commit-sha",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkout: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockResolvedValueOnce({ commit: expectedSha }),
      })

      const expected = {
        newSha: expectedSha,
      }
      const actual = await GitFileSystemService.create(
        "fake-repo",
        "fake-user-id",
        "fake content",
        "fake-dir",
        "create-media-file",
        "base64",
        DEFAULT_BRANCH
      )

      expect(actual._unsafeUnwrap()).toEqual(expected)
    })

    it("should create a directory and a file if the directory doesn't already exist", async () => {
      const expectedSha = "fake-hash"
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            author_name: "fake-author",
            author_email: "fake-email",
            date: "fake-date",
            message: "fake-message",
            hash: "test-commit-sha",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkout: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockResolvedValueOnce({ commit: expectedSha }),
      })

      const expected = {
        newSha: expectedSha,
      }
      const actual = await GitFileSystemService.create(
        "fake-repo",
        "fake-user-id",
        "fake content",
        "fake-create-dir",
        "create-file",
        "utf-8",
        DEFAULT_BRANCH
      )

      expect(actual._unsafeUnwrap()).toEqual(expected)
    })

    it("should return an error if the file already exists", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            author_name: "fake-author",
            author_email: "fake-email",
            date: "fake-date",
            message: "fake-message",
            hash: "test-commit-sha",
          },
        }),
      })
      const actual = await GitFileSystemService.create(
        "fake-repo",
        "fake-user-id",
        "fake content",
        "fake-dir",
        "fake-file",
        "utf-8",
        DEFAULT_BRANCH
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(ConflictError)
    })

    it("should rollback changes if an error occurred when committing", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            author_name: "fake-author",
            author_email: "fake-email",
            date: "fake-date",
            message: "fake-message",
            hash: "test-commit-sha",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkout: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        reset: jest.fn().mockReturnValueOnce({
          clean: jest.fn().mockResolvedValueOnce(undefined),
        }),
      })
      const spyRollback = jest.spyOn(GitFileSystemService, "rollback")

      const actual = await GitFileSystemService.create(
        "fake-repo",
        "fake-user-id",
        "fake content",
        "fake-dir",
        "create-file-rollback",
        "utf-8",
        DEFAULT_BRANCH
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
      expect(spyRollback).toHaveBeenCalledWith(
        "fake-repo",
        "test-commit-sha",
        "staging"
      )
    })
  })

  describe("read", () => {
    it("should read the contents of a file successfully", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-hash"),
      })

      const expected: GitFile = {
        content: "fake content",
        sha: "fake-hash",
      }
      const actual = await GitFileSystemService.read(
        "fake-repo",
        "fake-dir/fake-file"
      )

      expect(actual._unsafeUnwrap()).toEqual(expected)
    })

    it("should return a NotFoundError if the file does not exist", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.read(
        "fake-repo",
        "fake-dir/non-existent-file"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError)
    })

    it("should return a error if an error occurred when getting the Git blob hash", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.read(
        "fake-repo",
        "fake-dir/fake-file"
      )

      expect(result.isErr()).toBeTrue()
    })
  })

  describe("readMediaFile", () => {
    it("should read the contents of a media file successfully", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-hash"),
      })
      const fileStats = fs.statSync(
        `${EFS_VOL_PATH_STAGING}/fake-repo/fake-dir/fake-media-file.png`
      )

      const expected: MediaFileOutput = {
        name: "fake-media-file.png",
        sha: "fake-hash",
        mediaUrl: `data:image/png;base64,${Buffer.from(
          "fake media content"
        ).toString("base64")}`,
        mediaPath: "fake-dir/fake-media-file.png",
        type: "file",
        addedTime: fileStats.ctimeMs,
        size: fileStats.size,
      }

      const actual = await GitFileSystemService.readMediaFile(
        "fake-repo",
        "fake-dir",
        "fake-media-file.png"
      )

      expect(actual._unsafeUnwrap()).toEqual(expected)
    })

    it("should return a NotFoundError if the file does not exist", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce("fake-hash"),
      })

      const result = await GitFileSystemService.readMediaFile(
        "fake-repo",
        "fake-dir",
        "non-existent-file.png"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError)
    })

    it("should return a GitFileSystemError if an error occurred when getting the Git blob hash", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.readMediaFile(
        "fake-repo",
        "fake-dir",
        "fake-media-file.png"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  it("should return a MediaTypeError if the file has an invalid file extension", async () => {
    const result = await GitFileSystemService.readMediaFile(
      "fake-repo",
      "fake-dir",
      "fake-media-file.invalid"
    )

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(MediaTypeError)
  })

  it("should return a MediaTypeError if the file has no file extension", async () => {
    const result = await GitFileSystemService.readMediaFile(
      "fake-repo",
      "fake-dir",
      "fake-file"
    )

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(MediaTypeError)
  })

  describe("update", () => {
    it("should update the contents of a file successfully", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            author_name: "fake-author",
            author_email: "fake-email",
            date: "fake-date",
            message: "fake-message",
            hash: "test-commit-sha",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-old-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockResolvedValueOnce({ commit: "fake-new-hash" }),
      })

      const actual = await GitFileSystemService.update(
        "fake-repo",
        "fake-dir/fake-file",
        "fake new content",
        "fake-old-hash",
        "fake-user-id",
        DEFAULT_BRANCH
      )

      expect(actual._unsafeUnwrap()).toEqual("fake-new-hash")
    })

    it("should rollback changes if an error occurred when committing", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            author_name: "fake-author",
            author_email: "fake-email",
            date: "fake-date",
            message: "fake-message",
            hash: "test-commit-sha",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-old-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        reset: jest.fn().mockReturnValueOnce({
          clean: jest.fn().mockResolvedValueOnce(undefined),
        }),
      })
      const spyRollback = jest.spyOn(GitFileSystemService, "rollback")

      const actual = await GitFileSystemService.update(
        "fake-repo",
        "fake-dir/fake-file",
        "fake new content",
        "fake-old-hash",
        "fake-user-id",
        DEFAULT_BRANCH
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
      expect(spyRollback).toHaveBeenCalledWith(
        "fake-repo",
        "test-commit-sha",
        "staging"
      )
    })

    it("should return ConflictError if the old SHA provided does not match the current SHA", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            author_name: "fake-author",
            author_email: "fake-email",
            date: "fake-date",
            message: "fake-message",
            hash: "test-commit-sha",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-old-hash"),
      })

      const actual = await GitFileSystemService.update(
        "fake-repo",
        "fake-dir/fake-file",
        "fake new content",
        "fake-some-other-hash",
        "fake-user-id",
        DEFAULT_BRANCH
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(ConflictError)
    })

    it("should return a GitFileSystemError if the file path is not a file", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            author_name: "fake-author",
            author_email: "fake-email",
            date: "fake-date",
            message: "fake-message",
            hash: "test-commit-sha",
          },
        }),
      })

      const actual = await GitFileSystemService.update(
        "fake-repo",
        "fake-dir",
        "fake new content",
        "fake-old-hash",
        "fake-user-id",
        DEFAULT_BRANCH
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a NotFoundError if the file does not exist", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            author_name: "fake-author",
            author_email: "fake-email",
            date: "fake-date",
            message: "fake-message",
            hash: "test-commit-sha",
          },
        }),
      })

      const actual = await GitFileSystemService.update(
        "fake-repo",
        "fake-dir/non-existent-file",
        "fake new content",
        "fake-old-hash",
        "fake-user-id",
        DEFAULT_BRANCH
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError)
    })
  })

  describe("renameSinglePath", () => {
    it("should rename a file successfully", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })
      // Note: This will not cause the actual file to be renamed
      const mockGitMv = jest.fn().mockResolvedValueOnce(undefined)
      MockSimpleGit.cwd.mockReturnValueOnce({
        mv: mockGitMv,
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockResolvedValueOnce({ commit: "fake-new-hash" }),
      })

      const actual = await GitFileSystemService.renameSinglePath(
        "fake-repo",
        "fake-dir/fake-file",
        "fake-dir/fake-file-renamed",
        "fake-user-id",
        DEFAULT_BRANCH,
        "fake-message"
      )

      expect(actual._unsafeUnwrap()).toEqual("fake-new-hash")
      expect(mockGitMv).toHaveBeenCalledWith(
        "fake-dir/fake-file",
        "fake-dir/fake-file-renamed"
      )
    })

    it("should rename a directory successfully", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })
      // Note: This will not cause the actual file to be renamed
      const mockGitMv = jest.fn().mockResolvedValueOnce(undefined)
      MockSimpleGit.cwd.mockReturnValueOnce({
        mv: mockGitMv,
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockResolvedValueOnce({ commit: "fake-new-hash" }),
      })

      const actual = await GitFileSystemService.renameSinglePath(
        "fake-repo",
        "fake-dir",
        "fake-dir-renamed",
        "fake-user-id",
        DEFAULT_BRANCH,
        "fake-message"
      )

      expect(actual._unsafeUnwrap()).toEqual("fake-new-hash")
      expect(mockGitMv).toHaveBeenCalledWith("fake-dir", "fake-dir-renamed")
    })

    it("should rollback changes if an error occurred when committing", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        mv: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        reset: jest.fn().mockReturnValueOnce({
          clean: jest.fn().mockResolvedValueOnce(undefined),
        }),
      })

      const spyRollback = jest.spyOn(GitFileSystemService, "rollback")

      const actual = await GitFileSystemService.renameSinglePath(
        "fake-repo",
        "fake-dir",
        "fake-dir-renamed",
        "fake-user-id",
        DEFAULT_BRANCH,
        "fake-message"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
      expect(spyRollback).toHaveBeenCalledWith(
        "fake-repo",
        "fake-hash",
        "staging"
      )
    })

    it("should rollback changes if an error occurred when moving the file", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        mv: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        reset: jest.fn().mockReturnValueOnce({
          clean: jest.fn().mockResolvedValueOnce(undefined),
        }),
      })

      const spyRollback = jest.spyOn(GitFileSystemService, "rollback")

      const actual = await GitFileSystemService.renameSinglePath(
        "fake-repo",
        "fake-dir",
        "fake-dir-renamed",
        "fake-user-id",
        DEFAULT_BRANCH,
        "fake-message"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
      expect(spyRollback).toHaveBeenCalledWith(
        "fake-repo",
        "fake-hash",
        "staging"
      )
    })

    it("should return ConflictError if newPath is already an existing file/directory", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })

      const actual = await GitFileSystemService.renameSinglePath(
        "fake-repo",
        "fake-dir",
        "fake-empty-dir",
        "fake-user-id",
        DEFAULT_BRANCH,
        "fake-message"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(ConflictError)
    })

    it("should return NotFoundError if the oldPath does not exist", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })

      const actual = await GitFileSystemService.renameSinglePath(
        "fake-repo",
        "fake-nonexistent-dir",
        "fake-new-dir",
        "fake-user-id",
        DEFAULT_BRANCH,
        "fake-message"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError)
    })
  })

  describe("moveFiles", () => {
    it("should move files to an existing directory successfully", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockResolvedValueOnce({ commit: "fake-new-hash" }),
      })

      const actual = await GitFileSystemService.moveFiles(
        "fake-repo",
        "",
        "fake-dir",
        "fake-user-id",
        ["another-fake-file"],
        DEFAULT_BRANCH,
        "fake-message"
      )

      expect(actual._unsafeUnwrap()).toEqual("fake-new-hash")
    })

    it("should move files to a new directory successfully", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockResolvedValueOnce({ commit: "fake-new-hash" }),
      })

      const actual = await GitFileSystemService.moveFiles(
        "fake-repo",
        "",
        "fake-new-dir",
        "fake-user-id",
        ["another-fake-file"],
        DEFAULT_BRANCH,
        "fake-message"
      )

      expect(actual._unsafeUnwrap()).toEqual("fake-new-hash")
    })

    it("should rollback changes if an error occurred when committing", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        reset: jest.fn().mockReturnValueOnce({
          clean: jest.fn().mockResolvedValueOnce(undefined),
        }),
      })
      const spyRollback = jest.spyOn(GitFileSystemService, "rollback")

      const actual = await GitFileSystemService.moveFiles(
        "fake-repo",
        "",
        "fake-dir",
        "fake-user-id",
        ["another-fake-file"],
        DEFAULT_BRANCH,
        "fake-message"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
      expect(spyRollback).toHaveBeenCalledWith(
        "fake-repo",
        "fake-hash",
        "staging"
      )
    })

    it("should return ConflictError if newPath is already an existing file/directory", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })

      const actual = await GitFileSystemService.moveFiles(
        "fake-repo",
        "fake-dir",
        "another-fake-dir",
        "fake-user-id",
        ["fake-file"],
        DEFAULT_BRANCH,
        "fake-message"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(ConflictError)
    })

    it("should return GitFileSystemError if the oldPath is not a directory", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })

      const actual = await GitFileSystemService.moveFiles(
        "fake-repo",
        "another-fake-file",
        "another-fake-dir",
        "fake-user-id",
        ["fake-file"],
        DEFAULT_BRANCH,
        "fake-message"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return NotFoundError if the oldPath does not exist", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })

      const actual = await GitFileSystemService.moveFiles(
        "fake-repo",
        "fake-nonexistent-dir",
        "fake-new-dir",
        "fake-user-id",
        ["fake-file"],
        DEFAULT_BRANCH,
        "fake-message"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError)
    })
  })

  describe("getLatestCommitOfBranch", () => {
    it("should return the latest commit data from branch", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })
      const expected: GitHubCommitData = {
        sha: "fake-hash",
        message: "fake-message",
        author: {
          date: "fake-date",
          name: "fake-author",
          email: "fake-email",
        },
      }

      const actual = await GitFileSystemService.getLatestCommitOfBranch(
        "fake-repo-2",
        "master"
      )

      expect(actual._unsafeUnwrap()).toStrictEqual(expected)
      expect(MockSimpleGit.cwd).toHaveBeenCalledTimes(2)
    })

    it("should use with origin prefix if the branch does not exist locally", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest
          .fn()
          .mockResolvedValueOnce({ all: ["some-other-branch"] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            hash: "fake-hash",
            date: "fake-date",
            message: "fake-message",
            author_name: "fake-author",
            author_email: "fake-email",
          },
        }),
      })
      const expected: GitHubCommitData = {
        sha: "fake-hash",
        message: "fake-message",
        author: {
          date: "fake-date",
          name: "fake-author",
          email: "fake-email",
        },
      }

      const actual = await GitFileSystemService.getLatestCommitOfBranch(
        "fake-repo-2",
        "master"
      )

      expect(actual._unsafeUnwrap()).toStrictEqual(expected)
      expect(MockSimpleGit.cwd).toHaveBeenCalledTimes(2)
    })

    it("should throw error when simple-git throws error", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.getLatestCommitOfBranch(
        "fake-repo-2",
        "master"
      )
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should throw error when commit returned by simple-git is not as expected", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {},
        }),
      })

      const result = await GitFileSystemService.getLatestCommitOfBranch(
        "fake-repo-2",
        "master"
      )
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("delete", () => {
    it("should return a error if latest commit sha is not found", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            author_name: "fake-author",
            author_email: "fake-email",
            date: "fake-date",
            message: "fake-message",
            hash: undefined,
          },
        }),
      })

      const actual = await GitFileSystemService.delete(
        "fake-repo",
        "fake-dir/fake-file",
        "fake-old-hash",
        "fake-user-id",
        false,
        DEFAULT_BRANCH
      )
      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    describe("deleteFile", () => {
      it("should delete a file successfully", async () => {
        // getLatestCommitOfBranch
        MockSimpleGit.cwd.mockReturnValueOnce({
          branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
        })
        MockSimpleGit.cwd.mockReturnValueOnce({
          log: jest.fn().mockResolvedValueOnce({
            latest: {
              author_name: "fake-author",
              author_email: "fake-email",
              date: "fake-date",
              message: "fake-message",
              hash: "test-commit-sha",
            },
          }),
        })

        // getGitBlobHash
        MockSimpleGit.cwd.mockReturnValueOnce({
          revparse: jest.fn().mockResolvedValueOnce("fake-old-hash"),
        })

        // commit
        MockSimpleGit.cwd.mockReturnValueOnce({
          checkIsRepo: jest.fn().mockResolvedValueOnce(true),
        })

        // commit
        MockSimpleGit.cwd.mockReturnValueOnce({
          remote: jest
            .fn()
            .mockResolvedValueOnce(
              `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
            ),
        })

        // commit
        MockSimpleGit.cwd.mockReturnValueOnce({
          revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
        })

        // commit
        MockSimpleGit.cwd.mockReturnValueOnce({
          add: jest.fn().mockResolvedValueOnce(undefined),
        })

        // commit
        MockSimpleGit.cwd.mockReturnValueOnce({
          commit: jest.fn().mockResolvedValueOnce({ commit: "fake-new-hash" }),
        })

        const actual = await GitFileSystemService.delete(
          "fake-repo",
          "fake-dir/fake-file",
          "fake-old-hash",
          "fake-user-id",
          false,
          DEFAULT_BRANCH
        )

        expect(actual._unsafeUnwrap()).toEqual("fake-new-hash")
      })

      it("should return a error if the file is not valid", async () => {
        // getLatestCommitOfBranch
        MockSimpleGit.cwd.mockReturnValueOnce({
          branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
        })
        MockSimpleGit.cwd.mockReturnValueOnce({
          log: jest.fn().mockResolvedValueOnce({
            latest: {
              author_name: "fake-author",
              author_email: "fake-email",
              date: "fake-date",
              message: "fake-message",
              hash: "test-commit-sha",
            },
          }),
        })
        const mockStats = new Stats()
        const spyGetFilePathStats = jest
          .spyOn(GitFileSystemService, "getFilePathStats")
          .mockResolvedValueOnce(
            okAsync({
              ...mockStats,
              isFile: () => false,
              isDirectory: () => true,
            })
          )

        const actual = await GitFileSystemService.delete(
          "fake-repo",
          "fake-dir",
          "fake-old-hash",
          "fake-user-id",
          false,
          DEFAULT_BRANCH
        )
        expect(spyGetFilePathStats).toBeCalledTimes(1)
        expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
      })

      it("should return a error if the file hash does not match", async () => {
        // getLatestCommitOfBranch
        MockSimpleGit.cwd.mockReturnValueOnce({
          branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
        })
        MockSimpleGit.cwd.mockReturnValueOnce({
          log: jest.fn().mockResolvedValueOnce({
            latest: {
              author_name: "fake-author",
              author_email: "fake-email",
              date: "fake-date",
              message: "fake-message",
              hash: "wrong-sha",
            },
          }),
        })

        const mockStats = new Stats()
        jest
          .spyOn(GitFileSystemService, "getFilePathStats")
          .mockResolvedValueOnce(
            okAsync({
              ...mockStats,
              isFile: () => true,
              isDirectory: () => false,
            })
          )

        const spyGetGitBlobHash = jest
          .spyOn(GitFileSystemService, "getGitBlobHash")
          .mockReturnValueOnce(okAsync("correct-sha"))

        const actual = await GitFileSystemService.delete(
          "fake-repo",
          "fake-dir",
          "fake-old-hash",
          "fake-user-id",
          false,
          DEFAULT_BRANCH
        )
        expect(spyGetGitBlobHash).toBeCalledTimes(1)
        expect(actual._unsafeUnwrapErr()).toBeInstanceOf(ConflictError)
      })
    })

    describe("deleteDirectory", () => {
      it("should delete a directory successfully", async () => {
        MockSimpleGit.cwd.mockReturnValueOnce({
          branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
        })
        MockSimpleGit.cwd.mockReturnValueOnce({
          log: jest.fn().mockResolvedValueOnce({
            latest: {
              author_name: "fake-author",
              author_email: "fake-email",
              date: "fake-date",
              message: "fake-message",
              hash: "test-commit-sha",
            },
          }),
        })

        // commit
        MockSimpleGit.cwd.mockReturnValueOnce({
          checkIsRepo: jest.fn().mockResolvedValueOnce(true),
        })

        // commit
        MockSimpleGit.cwd.mockReturnValueOnce({
          remote: jest
            .fn()
            .mockResolvedValueOnce(
              `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
            ),
        })

        // commit
        MockSimpleGit.cwd.mockReturnValueOnce({
          revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
        })

        // commit
        MockSimpleGit.cwd.mockReturnValueOnce({
          add: jest.fn().mockResolvedValueOnce(undefined),
        })

        // commit
        MockSimpleGit.cwd.mockReturnValueOnce({
          commit: jest.fn().mockResolvedValueOnce({ commit: "fake-new-hash" }),
        })

        const actual = await GitFileSystemService.delete(
          "fake-repo",
          "fake-dir",
          "",
          "fake-user-id",
          true,
          DEFAULT_BRANCH
        )

        expect(actual._unsafeUnwrap()).toEqual("fake-new-hash")
      })

      it("should return a error if the directory is not valid", async () => {
        // getLatestCommitOfBranch
        MockSimpleGit.cwd.mockReturnValueOnce({
          branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
        })
        MockSimpleGit.cwd.mockReturnValueOnce({
          log: jest.fn().mockResolvedValueOnce({
            latest: {
              author_name: "fake-author",
              author_email: "fake-email",
              date: "fake-date",
              message: "fake-message",
              hash: "test-commit-sha",
            },
          }),
        })
        const mockStats = new Stats()
        const spyGetFilePathStats = jest
          .spyOn(GitFileSystemService, "getFilePathStats")
          .mockResolvedValueOnce(
            okAsync({
              ...mockStats,
              isFile: () => true,
              isDirectory: () => false,
            })
          )

        const actual = await GitFileSystemService.delete(
          "fake-repo",
          "fake-dir",
          "",
          "fake-user-id",
          true,
          DEFAULT_BRANCH
        )
        expect(spyGetFilePathStats).toBeCalledTimes(1)
        expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
      })

      it("should rollback changes if an error occurred when committing", async () => {
        MockSimpleGit.cwd.mockReturnValueOnce({
          branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
        })
        MockSimpleGit.cwd.mockReturnValueOnce({
          log: jest.fn().mockResolvedValueOnce({
            latest: {
              author_name: "fake-author",
              author_email: "fake-email",
              date: "fake-date",
              message: "fake-message",
              hash: "test-commit-sha",
            },
          }),
        })
        const mockStats = new Stats()
        jest
          .spyOn(GitFileSystemService, "getFilePathStats")
          .mockResolvedValueOnce(
            okAsync({
              ...mockStats,
              isFile: () => false,
              isDirectory: () => true,
            })
          )

        MockSimpleGit.cwd.mockReturnValueOnce({
          checkIsRepo: jest.fn().mockResolvedValueOnce(true),
        })
        MockSimpleGit.cwd.mockReturnValueOnce({
          remote: jest
            .fn()
            .mockResolvedValueOnce(
              `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
            ),
        })
        MockSimpleGit.cwd.mockReturnValueOnce({
          revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
        })
        MockSimpleGit.cwd.mockReturnValueOnce({
          add: jest.fn().mockResolvedValueOnce(undefined),
        })

        MockSimpleGit.cwd.mockReturnValueOnce({
          commit: jest.fn().mockRejectedValueOnce(new GitError()),
        })
        MockSimpleGit.cwd.mockReturnValueOnce({
          reset: jest.fn().mockReturnValueOnce({
            clean: jest.fn().mockResolvedValueOnce(undefined),
          }),
        })

        const spyRollback = jest.spyOn(GitFileSystemService, "rollback")

        const actual = await GitFileSystemService.delete(
          "fake-repo",
          "fake-dir",
          "fake new content",
          "fake-user-id",
          true,
          DEFAULT_BRANCH
        )

        expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
        expect(spyRollback).toHaveBeenCalledWith(
          "fake-repo",
          "test-commit-sha",
          "staging"
        )
      })
    })
  })

  describe("deleteMultipleFiles", () => {
    it("should delete multiple files successfully", async () => {
      const mockFiles = [
        {
          filePath: "fake-dir/fake-file",
          sha: "fake-sha-one",
        },
        {
          filePath: "another-fake-dir/fake-file",
          sha: "fake-sha-two",
        },
      ]

      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            author_name: "fake-author",
            author_email: "fake-email",
            date: "fake-date",
            message: "fake-message",
            hash: "test-commit-sha",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockResolvedValueOnce({ commit: "fake-new-hash" }),
      })

      const actual = await GitFileSystemService.deleteMultipleFiles(
        "fake-repo",
        mockFiles,
        "fake-user-id",
        DEFAULT_BRANCH
      )

      expect(actual._unsafeUnwrap()).toEqual("fake-new-hash")
    })

    it("should rollback changes if an error occurred when committing", async () => {
      const mockFiles = [
        {
          filePath: "fake-dir/fake-file",
          sha: "fake-sha-one",
        },
        {
          filePath: "another-fake-dir/fake-file",
          sha: "fake-sha-two",
        },
      ]

      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({ all: [BRANCH_REF] }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        log: jest.fn().mockResolvedValueOnce({
          latest: {
            author_name: "fake-author",
            author_email: "fake-email",
            date: "fake-date",
            message: "fake-message",
            hash: "test-commit-sha",
          },
        }),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockResolvedValueOnce(undefined),
      })

      MockSimpleGit.cwd.mockReturnValueOnce({
        commit: jest.fn().mockRejectedValueOnce(new GitError()),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        reset: jest.fn().mockReturnValueOnce({
          clean: jest.fn().mockResolvedValueOnce(undefined),
        }),
      })

      const spyRollback = jest.spyOn(GitFileSystemService, "rollback")

      const actual = await GitFileSystemService.deleteMultipleFiles(
        "fake-repo",
        mockFiles,
        "fake-user-id",
        DEFAULT_BRANCH
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
      expect(spyRollback).toHaveBeenCalledWith(
        "fake-repo",
        "test-commit-sha",
        "staging"
      )
    })
  })

  describe("updateRepoState", () => {
    it("should successfully update the repo state for a valid Git repo", async () => {
      const mockResetFn = jest.fn().mockResolvedValueOnce("reset")

      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        catFile: jest.fn().mockResolvedValueOnce("commit"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        reset: mockResetFn,
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        push: jest.fn().mockResolvedValueOnce(undefined),
      })

      const actual = await GitFileSystemService.updateRepoState(
        "fake-repo",
        BRANCH_REF,
        "fake-sha"
      )

      expect(actual._unsafeUnwrap()).toBeUndefined()
      expect(mockResetFn).toHaveBeenCalledWith(["--hard", "fake-sha"])
    })

    it("should successfully update the repo state for a valid Git repo with a non-standard branch", async () => {
      const mockResetFn = jest.fn().mockResolvedValueOnce("reset")
      const nonStandardBranchRef = "non-standard-branch"

      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(nonStandardBranchRef),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        catFile: jest.fn().mockResolvedValueOnce("commit"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        reset: mockResetFn,
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(nonStandardBranchRef),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        push: jest.fn().mockResolvedValueOnce(undefined),
      })

      const actual = await GitFileSystemService.updateRepoState(
        "fake-repo",
        nonStandardBranchRef,
        "another-fake-sha"
      )

      expect(actual._unsafeUnwrap()).toBeUndefined()
      expect(mockResetFn).toHaveBeenCalledWith(["--hard", "another-fake-sha"])
    })

    it("should return an error if an error occurred when resetting the repo", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        catFile: jest.fn().mockResolvedValueOnce("commit"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        reset: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const actual = await GitFileSystemService.updateRepoState(
        "fake-repo",
        BRANCH_REF,
        "fake-sha"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a BadRequestError if the SHA does not exist on the branch", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        catFile: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const actual = await GitFileSystemService.updateRepoState(
        "fake-repo",
        BRANCH_REF,
        "fake-sha"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(BadRequestError)
    })

    it("should return an error if an error occurred when checking if the SHA exists on the branch", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest
          .fn()
          .mockResolvedValueOnce(
            `git@github.com:${ISOMER_GITHUB_ORG_NAME}/fake-repo.git`
          ),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce(BRANCH_REF),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        catFile: jest.fn().mockRejectedValueOnce(new Error()),
      })

      const actual = await GitFileSystemService.updateRepoState(
        "fake-repo",
        BRANCH_REF,
        "fake-sha"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return an error if the repo is not a valid Git repo", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(false),
      })

      const actual = await GitFileSystemService.updateRepoState(
        "fake-repo",
        BRANCH_REF,
        "fake-sha"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("isLocalBranchPresent", () => {
    it("should return true if the local branch exists", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({
          all: ["staging"],
        }),
      })

      const actual = await GitFileSystemService.isLocalBranchPresent(
        "fake-repo",
        "staging"
      )

      expect(actual._unsafeUnwrap()).toEqual(true)
    })

    it("should return false if the local branch does not exist", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockResolvedValueOnce({
          all: ["staging"],
        }),
      })

      const actual = await GitFileSystemService.isLocalBranchPresent(
        "fake-repo",
        "master"
      )

      expect(actual._unsafeUnwrap()).toEqual(false)
    })

    it("should return GitFileSystemError if an error occurred when checking if the local branch exists", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        branchLocal: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const actual = await GitFileSystemService.isLocalBranchPresent(
        "fake-repo",
        "master"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("createLocalTrackingBranchIfNotExists", () => {
    it("should create local tracking branch if it does not exist yet", async () => {
      jest
        .spyOn(GitFileSystemService, "isLocalBranchPresent")
        .mockReturnValueOnce(okAsync(false))

      const branch = jest.fn().mockResolvedValueOnce(undefined)

      MockSimpleGit.cwd.mockReturnValueOnce({
        branch,
      })

      const result = await GitFileSystemService.createLocalTrackingBranchIfNotExists(
        "fake-repo",
        "master"
      )

      expect(result._unsafeUnwrap()).toEqual(true)
      expect(branch).toHaveBeenCalledWith([
        "--track",
        "master",
        "origin/master",
      ])
    })

    it("should not create local tracking branch if it already exists", async () => {
      jest
        .spyOn(GitFileSystemService, "isLocalBranchPresent")
        .mockReturnValueOnce(okAsync(true))

      const branch = jest.fn()

      MockSimpleGit.cwd.mockReturnValue({
        branch,
      })

      const result = await GitFileSystemService.createLocalTrackingBranchIfNotExists(
        "fake-repo",
        "master"
      )

      expect(result._unsafeUnwrap()).toEqual(true)
      expect(branch).not.toHaveBeenCalled()
    })
  })
})
