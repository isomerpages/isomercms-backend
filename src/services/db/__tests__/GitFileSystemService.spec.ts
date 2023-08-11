import mockFs from "mock-fs"
import { okAsync } from "neverthrow"
import { GitError, SimpleGit } from "simple-git"

import config from "@config/config"

import { ConflictError } from "@errors/ConflictError"
import GitFileSystemError from "@errors/GitFileSystemError"
import GitFileSystemNeedsRollbackError from "@errors/GitFileSystemNeedsRollbackError"
import { NotFoundError } from "@errors/NotFoundError"

import { ISOMER_GITHUB_ORG_NAME } from "@constants/constants"

import {
  MOCK_GITHUB_FILENAME_ALPHA_ONE,
  MOCK_GITHUB_COMMIT_MESSAGE_ALPHA_ONE,
} from "@fixtures/github"
import { MOCK_USER_ID_ONE } from "@fixtures/users"
import { GitHubCommitData } from "@root/types/commitData"
import { GitDirectoryItem, GitFile } from "@root/types/gitfilesystem"
import _GitFileSystemService from "@services/db/GitFileSystemService"

const MockSimpleGit = {
  checkIsRepo: jest.fn(),
  clone: jest.fn(),
  cwd: jest.fn(),
  remote: jest.fn(),
  revparse: jest.fn(),
}

const GitFileSystemService = new _GitFileSystemService(
  (MockSimpleGit as unknown) as SimpleGit
)

const BRANCH_REF = config.get("github.branchRef")

describe("GitFileSystemService", () => {
  beforeAll(() => {
    mockFs({
      [config.get("aws.efs.volPath")]: {
        "fake-repo": {
          "fake-dir": {
            "fake-file": "fake content",
          },
          "fake-empty-dir": {},
          "another-fake-file": "Another fake content",
        },
      },
    })
  })

  // Prevent inter-test pollution of mocks
  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    mockFs.restore()
  })

  describe("isGitInitialized", () => {
    it("should mark a valid Git repo as initialized", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })

      const result = await GitFileSystemService.isGitInitialized("fake-repo")

      expect(result._unsafeUnwrap()).toBeTrue()
    })

    it("should mark a non-Git folder as not initialized", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(false),
      })

      const result = await GitFileSystemService.isGitInitialized("fake-repo")

      expect(result._unsafeUnwrap()).toBeFalse()
    })

    it("should return a GitFileSystemError if a Git error occurs", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.isValidGitRepo("fake-repo")

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
        "fake-repo"
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
        "fake-repo"
      )

      expect(result._unsafeUnwrap()).toBeFalse()
    })

    it("should return a GitFileSystemError if a Git error occurs", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.isOriginRemoteCorrect(
        "fake-repo"
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

      const result = await GitFileSystemService.isValidGitRepo("fake-repo")

      expect(result._unsafeUnwrap()).toBeTrue()
    })

    it("should mark a Git repo with no remote as invalid", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(true),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        remote: jest.fn().mockResolvedValueOnce(null),
      })

      const result = await GitFileSystemService.isValidGitRepo("fake-repo")

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

      const result = await GitFileSystemService.isValidGitRepo("fake-repo")

      expect(result._unsafeUnwrap()).toBeFalse()
    })

    it("should mark a non-Git folder as invalid", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(false),
      })

      const result = await GitFileSystemService.isValidGitRepo("fake-repo")

      expect(result._unsafeUnwrap()).toBeFalse()
    })

    it("should mark a non-existent folder as invalid", async () => {
      const result = await GitFileSystemService.isValidGitRepo("non-existent")

      expect(result._unsafeUnwrap()).toBeFalse()
    })

    it("should return a GitFileSystemError if a Git error occurs", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.isValidGitRepo("fake-repo")

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("ensureCorrectBranch", () => {
    it("should perform a branch change if the current branch is not the correct branch", async () => {
      const revparseMock = jest.fn().mockResolvedValueOnce("incorrect-branch")
      const checkoutMock = jest.fn().mockResolvedValueOnce(undefined)

      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: revparseMock,
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkout: checkoutMock,
      })

      const result = await GitFileSystemService.ensureCorrectBranch("fake-repo")

      expect(revparseMock).toHaveBeenCalledWith(["--abbrev-ref", "HEAD"])
      expect(checkoutMock).toHaveBeenCalledWith(BRANCH_REF)
      expect(result._unsafeUnwrap()).toBeTrue()
    })

    it("should not perform a branch change if the current branch is the correct branch", async () => {
      const revparseMock = jest.fn().mockResolvedValueOnce(BRANCH_REF)

      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: revparseMock,
      })

      const result = await GitFileSystemService.ensureCorrectBranch("fake-repo")

      expect(revparseMock).toHaveBeenCalledWith(["--abbrev-ref", "HEAD"])
      expect(MockSimpleGit.cwd).toHaveBeenCalledTimes(1)
      expect(result._unsafeUnwrap()).toBeTrue()
    })

    it("should return an error if an error occurred when checking the current branch", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.ensureCorrectBranch("fake-repo")

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return an error if an error occurred when changing the branch", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("incorrect-branch"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkout: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.ensureCorrectBranch("fake-repo")

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
        "fake-dir/fake-file"
      )

      expect(result._unsafeUnwrap()).toBe("fake-hash")
    })

    it("should return an error for an untracked file", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const result = await GitFileSystemService.getGitBlobHash(
        "fake-repo",
        "fake-dir/fake-file"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("getFilePathStats", () => {
    it("should return the filesystem stats for a valid file", async () => {
      const result = await GitFileSystemService.getFilePathStats(
        "fake-repo",
        "fake-dir/fake-file"
      )

      expect(result._unsafeUnwrap().isFile()).toBeTrue()
    })

    it("should return the filesystem stats for a valid directory", async () => {
      const result = await GitFileSystemService.getFilePathStats(
        "fake-repo",
        "fake-empty-dir"
      )

      expect(result._unsafeUnwrap().isDirectory()).toBeTrue()
    })

    it("should return a NotFoundError for a non-existent path", async () => {
      const result = await GitFileSystemService.getFilePathStats(
        "fake-repo",
        "non-existent"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError)
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
        "fake-commit-sha"
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
        "fake-commit-sha"
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

      const result = await GitFileSystemService.clone("new-fake-repo")

      expect(result.isOk()).toBeTrue()
    })

    it("should do nothing if a valid Git repo already exists", async () => {
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

      const result = await GitFileSystemService.clone("fake-repo")

      expect(result.isOk()).toBeTrue()
    })

    it("should return a GitFileSystemError if an existing folder exists but does not have a valid remote", async () => {
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

      const result = await GitFileSystemService.clone("fake-repo")

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a GitFileSystemError if an existing folder exists but is not a Git repo", async () => {
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

      const result = await GitFileSystemService.pull("fake-repo")

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

      const result = await GitFileSystemService.pull("fake-repo")

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a GitFileSystemError if an existing folder exists but is not a valid Git repo", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(false),
      })

      const result = await GitFileSystemService.pull("fake-repo")

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

      const result = await GitFileSystemService.push("fake-repo")

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

      const result = await GitFileSystemService.push("fake-repo")

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a GitFileSystemError if an existing folder exists but is not a valid Git repo", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        checkIsRepo: jest.fn().mockResolvedValueOnce(false),
      })

      const result = await GitFileSystemService.push("fake-repo")

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
      const mockCommitSha = "fake-commit-sha"
      const mockCommitFn = jest
        .fn()
        .mockResolvedValueOnce({ commit: mockCommitSha })
      MockSimpleGit.cwd.mockReturnValueOnce({
        add: jest.fn().mockReturnValueOnce({
          commit: mockCommitFn,
        }),
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
        MOCK_GITHUB_COMMIT_MESSAGE_ALPHA_ONE
      )

      expect(result._unsafeUnwrap()).toBe(mockCommitSha)
      expect(mockCommitFn).toHaveBeenCalledWith(expectedCommitMessage)
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
        add: jest.fn().mockReturnValueOnce({
          commit: jest.fn().mockRejectedValueOnce(new GitError()),
        }),
      })

      const result = await GitFileSystemService.commit(
        "fake-repo",
        ["fake-dir/fake-file"],
        "fake-hash",
        "fake message"
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
        "fake message"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a GitFileSystemError if more than 2 pathspecs were provided", async () => {
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
        ["one", "two", "fake-dir/three"],
        "fake-hash",
        "fake message"
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
        "fake message"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })
  })

  describe("create", () => {
    it("should create a file successfully", async () => {
      const expectedSha = "fake-hash"

      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-hash"),
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
        add: jest.fn().mockReturnValueOnce({
          commit: jest.fn().mockResolvedValueOnce({ commit: expectedSha }),
        }),
      })

      const expected = {
        sha: expectedSha,
      }
      const actual = await GitFileSystemService.create({
        repoName: "fake-repo",
        userId: "fake-user-id",
        content: "fake content",
        directoryName: "fake-dir",
        fileName: "create-file",
      })

      expect(actual._unsafeUnwrap()).toEqual(expected)
    })

    it("should create a directory and a file if the directory doesn't already exist", async () => {
      const expectedSha = "fake-hash"
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
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
        add: jest.fn().mockReturnValueOnce({
          commit: jest.fn().mockResolvedValueOnce({ commit: expectedSha }),
        }),
      })

      const expected = {
        sha: expectedSha,
      }
      const actual = await GitFileSystemService.create({
        repoName: "fake-repo",
        userId: "fake-user-id",
        content: "fake content",
        directoryName: "fake-create-dir",
        fileName: "create-file",
      })

      expect(actual._unsafeUnwrap()).toEqual(expected)
    })

    it("should return an error if the file already exists", async () => {
      const actual = await GitFileSystemService.create({
        repoName: "fake-repo",
        userId: "fake-user-id",
        content: "fake content",
        directoryName: "fake-dir",
        fileName: "fake-file",
      })

      expect(actual.isErr()).toBeTrue()
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

  describe("listDirectoryContents", () => {
    it("should return the contents of a directory successfully", async () => {
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
        sha: "fake-dir-hash",
        path: "fake-dir",
        size: 0,
      }
      const expectedFakeEmptyDir: GitDirectoryItem = {
        name: "fake-empty-dir",
        type: "dir",
        sha: "fake-empty-dir-hash",
        path: "fake-empty-dir",
        size: 0,
      }
      const expectedAnotherFakeFile: GitDirectoryItem = {
        name: "another-fake-file",
        type: "file",
        sha: "another-fake-file-hash",
        path: "another-fake-file",
        size: "Another fake content".length,
      }

      const result = await GitFileSystemService.listDirectoryContents(
        "fake-repo",
        ""
      )
      const actual = result
        ._unsafeUnwrap()
        .sort((a, b) => a.name.localeCompare(b.name))

      expect(actual).toMatchObject([
        expectedAnotherFakeFile,
        expectedFakeDir,
        expectedFakeEmptyDir,
      ])
    })

    it("should return only results of files that are tracked by Git", async () => {
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("another-fake-file-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockResolvedValueOnce("fake-dir-hash"),
      })
      MockSimpleGit.cwd.mockReturnValueOnce({
        revparse: jest.fn().mockRejectedValueOnce(new GitError()),
      })

      const expectedFakeDir: GitDirectoryItem = {
        name: "fake-dir",
        type: "dir",
        sha: "fake-dir-hash",
        path: "fake-dir",
        size: 0,
      }
      const expectedAnotherFakeFile: GitDirectoryItem = {
        name: "another-fake-file",
        type: "file",
        sha: "another-fake-file-hash",
        path: "another-fake-file",
        size: "Another fake content".length,
      }

      const result = await GitFileSystemService.listDirectoryContents(
        "fake-repo",
        ""
      )

      const actual = result
        ._unsafeUnwrap()
        .sort((a, b) => a.name.localeCompare(b.name))

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

      const actual = await GitFileSystemService.listDirectoryContents(
        "fake-repo",
        ""
      )

      expect(actual._unsafeUnwrap()).toHaveLength(0)
    })

    it("should return an empty result if the directory is empty", async () => {
      const actual = await GitFileSystemService.listDirectoryContents(
        "fake-repo",
        "fake-empty-dir"
      )

      expect(actual._unsafeUnwrap()).toHaveLength(0)
    })

    it("should return a GitFileSystemError if the path is not a directory", async () => {
      const result = await GitFileSystemService.listDirectoryContents(
        "fake-repo",
        "fake-dir/fake-file"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a NotFoundError if the path does not exist", async () => {
      const result = await GitFileSystemService.listDirectoryContents(
        "fake-repo",
        "non-existent-dir"
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError)
    })
  })

  describe("update", () => {
    it("should update the contents of a file successfully", async () => {
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
        add: jest.fn().mockReturnValueOnce({
          commit: jest.fn().mockResolvedValueOnce({ commit: "fake-new-hash" }),
        }),
      })

      const actual = await GitFileSystemService.update(
        "fake-repo",
        "fake-dir/fake-file",
        "fake new content",
        "fake-old-hash",
        "fake-user-id"
      )

      expect(actual._unsafeUnwrap()).toEqual("fake-new-hash")
    })

    it("should rollback changes if an error occurred when committing", async () => {
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
        add: jest.fn().mockReturnValueOnce({
          commit: jest.fn().mockRejectedValueOnce(new GitError()),
        }),
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
        "fake-user-id"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
      expect(spyRollback).toHaveBeenCalledWith("fake-repo", "test-commit-sha")
    })

    it("should return ConflictError if the old SHA provided does not match the current SHA", async () => {
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
        "fake-user-id"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(ConflictError)
    })

    it("should return a GitFileSystemError if the file path is not a file", async () => {
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
        "fake-user-id"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(GitFileSystemError)
    })

    it("should return a NotFoundError if the file does not exist", async () => {
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
        "fake-user-id"
      )

      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError)
    })
  })

  describe("getLatestCommitOfBranch", () => {
    it("should return the latest commit data from branch", async () => {
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
    })

    it("should throw error when simple-git throws error", async () => {
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
})
