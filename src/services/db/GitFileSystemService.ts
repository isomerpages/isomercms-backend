import fs from "fs"

import {
  combine,
  err,
  errAsync,
  ok,
  okAsync,
  Result,
  ResultAsync,
} from "neverthrow"
import { GitError, SimpleGit } from "simple-git"

import { config } from "@config/config"

import GitFileSystemError from "@errors/GitFileSystemError"

import { ISOMER_GITHUB_ORG_NAME } from "@constants/constants"

import type { GitDirectoryItem, GitFile } from "@root/types/gitfilesystem"

/**
 * Some notes:
 * - Seems like getTree, updateTree and updateRepoState is always used together
 */

const EFS_VOL_PATH = config.get("aws.efs.volPath")
const BRANCH_REF = config.get("github.branchRef")

export default class GitFileSystemService {
  private readonly git: SimpleGit

  constructor(git: SimpleGit) {
    this.git = git
  }

  isGitInitialized(repoName: string): ResultAsync<boolean, GitFileSystemError> {
    return ResultAsync.fromPromise(
      this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).checkIsRepo(),
      (error) => {
        if (error instanceof GitError) {
          return new GitFileSystemError(error.message)
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    )
  }

  isOriginRemoteCorrect(
    repoName: string
  ): ResultAsync<boolean, GitFileSystemError> {
    const originUrl = `git@github.com:${ISOMER_GITHUB_ORG_NAME}/${repoName}.git`

    return ResultAsync.fromPromise(
      this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).remote(["get-url", "origin"]),
      (error) => {
        if (error instanceof GitError) {
          return new GitFileSystemError(error.message)
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    ).map((remoteUrl) => !!remoteUrl && remoteUrl.trim() === originUrl)
  }

  // Determine if the folder is a valid Git repository
  isValidGitRepo(repoName: string): ResultAsync<boolean, GitFileSystemError> {
    const safeExistsSync = Result.fromThrowable(fs.existsSync, (error) => {
      if (error instanceof GitError || error instanceof Error) {
        return new GitFileSystemError(error.message)
      }

      return new GitFileSystemError("An unknown error occurred")
    })

    return safeExistsSync(`${EFS_VOL_PATH}/${repoName}`)
      .andThen((isFolderExisting) => {
        if (!isFolderExisting) {
          return err(false)
        }
        return ok(true)
      })
      .asyncAndThen(() => this.isGitInitialized(repoName))
      .andThen((isGitInitialized) => {
        if (!isGitInitialized) {
          return err(false)
        }
        return ok(true)
      })
      .andThen(() => this.isOriginRemoteCorrect(repoName))
      .andThen((isOriginRemoteCorrect) => {
        if (!isOriginRemoteCorrect) {
          return err(false)
        }
        return ok(true)
      })
      .orElse((error) => {
        if (typeof error === "boolean") {
          return okAsync(false)
        }
        return errAsync(error)
      })
  }

  // Obtain the Git blob hash of a file or directory
  getGitBlobHash(
    repoName: string,
    filePath: string
  ): ResultAsync<string, GitFileSystemError> {
    return ResultAsync.fromPromise(
      this.git
        .cwd(`${EFS_VOL_PATH}/${repoName}`)
        .checkout(BRANCH_REF)
        .revparse([`HEAD:${filePath}`]),
      (error) => {
        if (error instanceof GitError) {
          return new GitFileSystemError(error.message)
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    )
  }

  // Clone repository from upstream Git hosting provider
  clone(repoName: string): ResultAsync<string, GitFileSystemError> {
    const originUrl = `git@github.com:${ISOMER_GITHUB_ORG_NAME}/${repoName}.git`
    const safeExistsSync = Result.fromThrowable(fs.existsSync, (error) => {
      if (error instanceof GitError || error instanceof Error) {
        return new GitFileSystemError(error.message)
      }

      return new GitFileSystemError("An unknown error occurred")
    })

    return safeExistsSync(`${EFS_VOL_PATH}/${repoName}`).asyncAndThen(
      (isFolderExisting) => {
        if (!isFolderExisting) {
          return ResultAsync.fromPromise(
            this.git
              .clone(originUrl, `${EFS_VOL_PATH}/${repoName}`)
              .cwd(`${EFS_VOL_PATH}/${repoName}`)
              .checkout(BRANCH_REF),
            (error) => {
              if (error instanceof GitError) {
                return new GitFileSystemError(error.message)
              }

              return new GitFileSystemError("An unknown error occurred")
            }
          ).map(() => `${EFS_VOL_PATH}/${repoName}`)
        }

        return this.isGitInitialized(repoName)
          .andThen((isGitInitialized) => {
            if (!isGitInitialized) {
              return errAsync(
                new GitFileSystemError(
                  `An existing folder "${repoName}" exists but is not a Git repo`
                )
              )
            }
            return okAsync(true)
          })
          .andThen(() => this.isOriginRemoteCorrect(repoName))
          .andThen((isOriginRemoteCorrect) => {
            if (!isOriginRemoteCorrect) {
              return errAsync(
                new GitFileSystemError(
                  `An existing folder "${repoName}" exists but is not the correct Git repo`
                )
              )
            }
            return okAsync(`${EFS_VOL_PATH}/${repoName}`)
          })
      }
    )
  }

  // Pull the latest changes from upstream Git hosting provider
  // TODO: Pulling is a very expensive operation, should find a way to optimise
  pull(repoName: string): ResultAsync<string, GitFileSystemError> {
    return this.isValidGitRepo(repoName).andThen((isValid) => {
      if (!isValid) {
        return errAsync(
          new GitFileSystemError(`Folder "${repoName}" is not a valid Git repo`)
        )
      }

      return ResultAsync.fromPromise(
        this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).checkout(BRANCH_REF).pull(),
        (error) => {
          if (error instanceof GitError) {
            return new GitFileSystemError(error.message)
          }

          return new GitFileSystemError("An unknown error occurred")
        }
      ).map(() => `${EFS_VOL_PATH}/${repoName}`)
    })
  }

  // TODO: Creates either directory or file
  // ResourceDirectoryService used this to create a directory + file at the same time
  create() {}

  // Read the contents of a file
  read(
    repoName: string,
    filePath: string
  ): ResultAsync<GitFile, GitFileSystemError> {
    return this.pull(repoName).andThen(() =>
      combine([
        ResultAsync.fromPromise(
          fs.promises.readFile(
            `${EFS_VOL_PATH}/${repoName}/${filePath}`,
            "utf-8"
          ),
          (error) => {
            if (error instanceof Error) {
              return new GitFileSystemError(error.message)
            }

            return new GitFileSystemError("An unknown error occurred")
          }
        ),
        this.getGitBlobHash(repoName, filePath),
      ]).map((contentsAndHash) => {
        const [contents, sha] = contentsAndHash
        const result: GitFile = {
          contents,
          sha,
        }
        return result
      })
    )
  }

  // Read the contents of a directory
  listDirectoryContents(
    repoName: string,
    directoryPath: string
  ): ResultAsync<GitDirectoryItem[], GitFileSystemError> {
    return ResultAsync.fromPromise(
      fs.promises.stat(`${EFS_VOL_PATH}/${repoName}/${directoryPath}`),
      (error) => {
        if (error instanceof Error) {
          return new GitFileSystemError(error.message)
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    )
      .andThen((stats) => {
        if (!stats.isDirectory()) {
          return errAsync(
            new GitFileSystemError(
              `Path "${directoryPath}" is not a directory in repo "${repoName}"`
            )
          )
        }
        return okAsync(true)
      })
      .andThen(() =>
        ResultAsync.fromPromise(
          fs.promises.readdir(`${EFS_VOL_PATH}/${repoName}/${directoryPath}`, {
            withFileTypes: true,
          }),
          (error) => {
            if (error instanceof Error) {
              return new GitFileSystemError(error.message)
            }

            return new GitFileSystemError("An unknown error occurred")
          }
        )
      )
      .andThen((directoryContents) => {
        const resultAsyncs = directoryContents.map((directoryItem) => {
          const isDirectory = directoryItem.isDirectory()
          const { name } = directoryItem
          const path = directoryPath === "" ? name : `${directoryPath}/${name}`
          const type = isDirectory ? "dir" : "file"

          return this.getGitBlobHash(repoName, path)
            .orElse(() => okAsync(""))
            .andThen((sha) => {
              const result: GitDirectoryItem = {
                name,
                type,
                sha,
                path,
              }

              return okAsync(result)
            })
        })

        return combine(resultAsyncs)
      })
      .andThen((directoryItems) =>
        // Note: The sha is empty if the file is not tracked by Git
        okAsync(directoryItems.filter((item) => item.sha !== ""))
      )
  }

  // TODO: Update the contents of a file
  async update() {}

  // TODO: Delete a file
  async delete() {}

  // TODO: Get the latest commit of branch
  async getLatestCommitOfBranch() {}
}
