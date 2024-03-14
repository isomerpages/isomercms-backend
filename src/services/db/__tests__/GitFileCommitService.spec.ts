import { ResultAsync, ok, okAsync } from "neverthrow"
import { SimpleGit } from "simple-git"

import config from "@config/config"

import GitFileSystemError from "@errors/GitFileSystemError"

import { STAGING_BRANCH, STAGING_LITE_BRANCH } from "@constants/constants"

import {
  mockGithubSessionData,
  mockUserWithSiteSessionData,
} from "@root/fixtures/sessionData"
import _GitFileCommitService from "@services/db/GitFileCommitService"
import _GitFileSystemService from "@services/db/GitFileSystemService"

import * as gbUtils from "../../../utils/growthbook-utils"

const MockSimpleGit = {
  clone: jest.fn(),
  cwd: jest.fn(),
}

const gitFileSystemService = new _GitFileSystemService(
  (MockSimpleGit as unknown) as SimpleGit
)

const gitFileCommitService = new _GitFileCommitService(gitFileSystemService)

const BRANCH_REF = config.get("github.branchRef")
const DEFAULT_BRANCH = "staging"
const sessionData = mockUserWithSiteSessionData
describe("GitFileCommitService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("pushToGithub", () => {
    it("should push to staging and staging-lite", async () => {
      // Arrange
      const pushSpy = jest
        .spyOn(gitFileSystemService, "push")
        .mockImplementation((siteName, branchName) =>
          ResultAsync.fromPromise(
            Promise.resolve("push ok"),
            () => new GitFileSystemError("push failed")
          )
        )

      // Act
      await gitFileCommitService.pushToGithub(sessionData, true)

      // Assert
      expect(pushSpy).toHaveBeenCalledWith(sessionData.siteName, STAGING_BRANCH)
      expect(pushSpy).toHaveBeenCalledWith(
        sessionData.siteName,
        STAGING_LITE_BRANCH
      )
    })

    it("should only push to staging if shouldUpdateStagingLite is false", async () => {
      // Arrange
      const pushSpy = jest
        .spyOn(gitFileSystemService, "push")
        .mockResolvedValue(okAsync("push ok"))

      // Act
      await gitFileCommitService.pushToGithub(sessionData, false)

      // Assert
      expect(pushSpy).toHaveBeenCalledWith(sessionData.siteName, STAGING_BRANCH)
      expect(pushSpy).toHaveBeenCalledTimes(1)
    })

    describe("create", () => {
      it("should create a file and push to GitHub", async () => {
        // Arrange

        const content = "file content"
        const fileName = "file.txt"
        const directoryName = "directory"
        const isMedia = false

        const createSpy = jest
          .spyOn(gitFileSystemService, "create")
          .mockResolvedValue(okAsync({ newSha: "new-sha" }))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))
        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(true)
        // Act
        const result = await gitFileCommitService.create(sessionData, {
          content,
          fileName,
          directoryName,
          isMedia,
        })

        // Assert
        expect(createSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          sessionData.isomerUserId,
          content,
          directoryName,
          fileName,
          "utf-8",
          STAGING_BRANCH
        )
        expect(createSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          sessionData.isomerUserId,
          content,
          directoryName,
          fileName,
          "utf-8",
          STAGING_LITE_BRANCH
        )
        expect(pushSpy).toHaveBeenCalledWith(sessionData, expect.any(Boolean))
        expect(result).toEqual({ sha: "new-sha" })
      })

      it("should create a file and commit only to staging branch when not whitelisted", async () => {
        const content = "file content"
        const fileName = "file.txt"
        const directoryName = "directory"
        const isMedia = false

        const createSpy = jest
          .spyOn(gitFileSystemService, "create")
          .mockResolvedValue(okAsync({ newSha: "new-sha" }))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))

        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(false)

        // Act
        const result = await gitFileCommitService.create(sessionData, {
          content,
          fileName,
          directoryName,
          isMedia,
        })

        // Assert
        expect(createSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          sessionData.isomerUserId,
          content,
          directoryName,
          fileName,
          isMedia ? "base64" : "utf-8",
          STAGING_BRANCH
        )
        expect(createSpy).toHaveBeenCalledTimes(1) // create is called only once for the staging branch
        expect(pushSpy).toHaveBeenCalledWith(sessionData, false) // push is called with shouldUpdateStagingLite as false
        expect(result).toEqual({ sha: "new-sha" })
      })
    })

    describe("update", () => {
      it("should update a file and push to GitHub", async () => {
        // Arrange
        const fileContent = "updated file content"
        const sha = "old-sha"
        const fileName = "file.txt"
        const directoryName = "directory"

        const updateSpy = jest
          .spyOn(gitFileSystemService, "update")
          .mockResolvedValue(okAsync("new-sha"))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))

        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(true)

        // Act
        const result = await gitFileCommitService.update(sessionData, {
          fileContent,
          sha,
          fileName,
          directoryName,
        })

        // Assert
        const filePath = directoryName
          ? `${directoryName}/${fileName}`
          : fileName
        expect(updateSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          filePath,
          fileContent,
          sha,
          sessionData.isomerUserId,
          STAGING_BRANCH
        )

        expect(updateSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          filePath,
          fileContent,
          sha,
          sessionData.isomerUserId,
          STAGING_LITE_BRANCH
        )
        expect(pushSpy).toHaveBeenCalledWith(sessionData, expect.any(Boolean))
        expect(result).toEqual({ newSha: "new-sha" })
      })

      it("should update a file and commit only to staging branch when not whitelisted", async () => {
        const fileContent = "updated file content"
        const sha = "old-sha"
        const fileName = "file.txt"
        const directoryName = "directory"

        const updateSpy = jest
          .spyOn(gitFileSystemService, "update")
          .mockResolvedValue(okAsync("new-sha"))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))

        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(false)

        // Act
        const result = await gitFileCommitService.update(sessionData, {
          fileContent,
          sha,
          fileName,
          directoryName,
        })

        // Assert
        const filePath = directoryName
          ? `${directoryName}/${fileName}`
          : fileName
        expect(updateSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          filePath,
          fileContent,
          sha,
          sessionData.isomerUserId,
          STAGING_BRANCH
        )
        expect(updateSpy).toHaveBeenCalledTimes(1) // update is called only once for the staging branch
        expect(pushSpy).toHaveBeenCalledWith(sessionData, false) // push is called with shouldUpdateStagingLite as false
        expect(result).toEqual({ newSha: "new-sha" })
      })
    })

    describe("deleteDirectory", () => {
      it("should delete a directory and push to GitHub", async () => {
        // Arrange
        const directoryName = "directory"

        const deleteSpy = jest
          .spyOn(gitFileSystemService, "delete")
          .mockResolvedValue(okAsync(""))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))

        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(true)

        // Act
        await gitFileCommitService.deleteDirectory(sessionData, {
          directoryName,
        })

        // Assert
        expect(deleteSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          directoryName,
          "",
          sessionData.isomerUserId,
          true,
          STAGING_BRANCH
        )
        expect(deleteSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          directoryName,
          "",
          sessionData.isomerUserId,
          true,
          STAGING_LITE_BRANCH
        )
        expect(pushSpy).toHaveBeenCalledWith(sessionData, expect.any(Boolean))
      })

      it("should delete a directory and commit only to staging branch when not whitelisted", async () => {
        const directoryName = "directory"

        const deleteSpy = jest
          .spyOn(gitFileSystemService, "delete")
          .mockResolvedValue(okAsync(""))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))

        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(false)

        // Act
        await gitFileCommitService.deleteDirectory(sessionData, {
          directoryName,
        })

        // Assert
        expect(deleteSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          directoryName,
          "",
          sessionData.isomerUserId,
          true,
          STAGING_BRANCH
        )
        expect(deleteSpy).toHaveBeenCalledTimes(1) // delete is called only once for the staging branch
        expect(pushSpy).toHaveBeenCalledWith(sessionData, false) // push is called with shouldUpdateStagingLite as false
      })
    })

    describe("delete", () => {
      it("should delete a file and push to GitHub", async () => {
        // Arrange
        const sha = "file-sha"
        const fileName = "file.txt"
        const directoryName = "directory"

        const deleteSpy = jest
          .spyOn(gitFileSystemService, "delete")
          .mockResolvedValue(okAsync(""))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))
        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(true)

        // Act
        await gitFileCommitService.delete(sessionData, {
          sha,
          fileName,
          directoryName,
        })

        // Assert
        const filePath = directoryName
          ? `${directoryName}/${fileName}`
          : fileName
        expect(deleteSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          filePath,
          sha,
          sessionData.isomerUserId,
          false,
          STAGING_BRANCH
        )
        expect(deleteSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          filePath,
          sha,
          sessionData.isomerUserId,
          false,
          STAGING_LITE_BRANCH
        )
        expect(pushSpy).toHaveBeenCalledWith(sessionData, expect.any(Boolean))
      })

      it("should delete a file and commit only to staging branch when not whitelisted", async () => {
        const sha = "file-sha"
        const fileName = "file.txt"
        const directoryName = "directory"

        const deleteSpy = jest
          .spyOn(gitFileSystemService, "delete")
          .mockResolvedValue(okAsync(""))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))

        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(false)

        // Act
        await gitFileCommitService.delete(sessionData, {
          sha,
          fileName,
          directoryName,
        })

        // Assert
        const filePath = directoryName
          ? `${directoryName}/${fileName}`
          : fileName
        expect(deleteSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          filePath,
          sha,
          sessionData.isomerUserId,
          false,
          STAGING_BRANCH
        )
        expect(deleteSpy).toHaveBeenCalledTimes(1) // delete is called only once for the staging branch
        expect(pushSpy).toHaveBeenCalledWith(sessionData, false) // push is called with shouldUpdateStagingLite as false
      })
    })

    describe("deleteMultipleFiles", () => {
      it("should delete multiple files or directories and push to GitHub", async () => {
        // Arrange
        const mockFiles = [
          {
            filePath: "test-file-one",
            sha: "test-sha-one",
          },
          {
            filePath: "test-file-two",
            sha: "test-sha-two",
          },
        ]
        const deleteMultipleFilesSpy = jest
          .spyOn(gitFileSystemService, "deleteMultipleFiles")
          .mockResolvedValue(okAsync(""))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))
        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(true)

        // Act
        await gitFileCommitService.deleteMultipleFiles(
          sessionData,
          mockGithubSessionData,
          {
            items: mockFiles,
          }
        )

        // Assert
        expect(deleteMultipleFilesSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          mockFiles,
          sessionData.isomerUserId,
          STAGING_BRANCH
        )
        expect(deleteMultipleFilesSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          mockFiles,
          sessionData.isomerUserId,
          STAGING_LITE_BRANCH
        )
        expect(pushSpy).toHaveBeenCalledWith(sessionData, expect.any(Boolean))
      })

      it("should delete multiple files or directories and commit only to staging branch when not whitelisted", async () => {
        const mockFiles = [
          {
            filePath: "test-file-one",
            sha: "test-sha-one",
          },
          {
            filePath: "test-file-two",
            sha: "test-sha-two",
          },
        ]
        const deleteMultipleFilesSpy = jest
          .spyOn(gitFileSystemService, "deleteMultipleFiles")
          .mockResolvedValue(okAsync(""))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))

        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(false)

        // Act
        await gitFileCommitService.deleteMultipleFiles(
          sessionData,
          mockGithubSessionData,
          {
            items: mockFiles,
          }
        )

        // Assert
        expect(deleteMultipleFilesSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          mockFiles,
          sessionData.isomerUserId,
          STAGING_BRANCH
        )
        expect(deleteMultipleFilesSpy).toHaveBeenCalledTimes(1) // delete is called only once for the staging branch
        expect(pushSpy).toHaveBeenCalledWith(sessionData, false) // push is called with shouldUpdateStagingLite as false
      })
    })

    describe("renameSinglePath", () => {
      it("should rename a file or directory and push to GitHub", async () => {
        // Arrange
        const oldPath = "old-path"
        const newPath = "new-path"
        const message = "rename message"

        const renameSpy = jest
          .spyOn(gitFileSystemService, "renameSinglePath")
          .mockResolvedValue(okAsync("new-sha"))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))
        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(true)

        // Act
        const result = await gitFileCommitService.renameSinglePath(
          sessionData,
          mockGithubSessionData,
          oldPath,
          newPath,
          message
        )

        // Assert
        expect(renameSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          oldPath,
          newPath,
          sessionData.isomerUserId,
          STAGING_BRANCH,
          message
        )
        expect(renameSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          oldPath,
          newPath,
          sessionData.isomerUserId,
          STAGING_LITE_BRANCH,
          message
        )
        expect(pushSpy).toHaveBeenCalledWith(sessionData, expect.any(Boolean))
        expect(result).toEqual({ newSha: "new-sha" })
      })

      it("should rename a file or directory and commit only to staging branch when not whitelisted", async () => {
        const oldPath = "old-path"
        const newPath = "new-path"
        const message = "rename message"

        const renameSpy = jest
          .spyOn(gitFileSystemService, "renameSinglePath")
          .mockResolvedValue(okAsync("new-sha"))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))

        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(false)

        // Act
        const result = await gitFileCommitService.renameSinglePath(
          sessionData,
          mockGithubSessionData,
          oldPath,
          newPath,
          message
        )

        // Assert
        expect(renameSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          oldPath,
          newPath,
          sessionData.isomerUserId,
          STAGING_BRANCH,
          message
        )
        expect(renameSpy).toHaveBeenCalledTimes(1) // renameSinglePath is called only once for the staging branch
        expect(pushSpy).toHaveBeenCalledWith(sessionData, false) // push is called with shouldUpdateStagingLite as false
        expect(result).toEqual({ newSha: "new-sha" })
      })
    })

    describe("moveFiles", () => {
      it("should move files and push to GitHub", async () => {
        // Arrange
        const oldPath = "old-path"
        const newPath = "new-path"
        const targetFiles = ["file1.txt", "file2.txt"]
        const message = "move files message"

        const moveFilesSpy = jest
          .spyOn(gitFileSystemService, "moveFiles")
          .mockResolvedValue(okAsync("new-sha"))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))
        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(true)

        // Act
        const result = await gitFileCommitService.moveFiles(
          sessionData,
          mockGithubSessionData,
          oldPath,
          newPath,
          targetFiles,
          message
        )

        // Assert
        expect(moveFilesSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          oldPath,
          newPath,
          sessionData.isomerUserId,
          targetFiles,
          STAGING_BRANCH,
          message
        )
        expect(moveFilesSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          oldPath,
          newPath,
          sessionData.isomerUserId,
          targetFiles,
          STAGING_LITE_BRANCH,
          message
        )
        expect(pushSpy).toHaveBeenCalledWith(sessionData, expect.any(Boolean))
        expect(result).toEqual({ newSha: "new-sha" })
      })

      it("should move files and commit only to staging branch when not whitelisted", async () => {
        const oldPath = "old-path"
        const newPath = "new-path"
        const targetFiles = ["file1.txt", "file2.txt"]
        const message = "move files message"

        const moveFilesSpy = jest
          .spyOn(gitFileSystemService, "moveFiles")
          .mockResolvedValue(okAsync("new-sha"))
        const pushSpy = jest
          .spyOn(gitFileCommitService, "pushToGithub")
          .mockResolvedValue(ok(""))

        jest
          .spyOn(gbUtils, "isReduceBuildTimesWhitelistedRepo")
          .mockReturnValue(false)

        // Act
        const result = await gitFileCommitService.moveFiles(
          sessionData,
          mockGithubSessionData,
          oldPath,
          newPath,
          targetFiles,
          message
        )

        // Assert
        expect(moveFilesSpy).toHaveBeenCalledWith(
          sessionData.siteName,
          oldPath,
          newPath,
          sessionData.isomerUserId,
          targetFiles,
          STAGING_BRANCH,
          message
        )
        expect(moveFilesSpy).toHaveBeenCalledTimes(1) // moveFiles is called only once for the staging branch
        expect(pushSpy).toHaveBeenCalledWith(sessionData, false) // push is called with shouldUpdateStagingLite as false
        expect(result).toEqual({ newSha: "new-sha" })
      })
    })
  })
})
