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

import logger from "@logger/logger"

import GitFileSystemError from "@errors/GitFileSystemError"

import { ISOMER_GITHUB_ORG_NAME } from "@constants/constants"

import { SessionDataProps } from "@root/classes"
import { NotFoundError } from "@root/errors/NotFoundError"
import {
  GitHubCommitData,
  GitLocalDiskRawCommitData,
} from "@root/types/commitData"
import type { GitDirectoryItem, GitFile } from "@root/types/gitfilesystem"
import { IsomerCommitMessage } from "@root/types/github"

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

        logger.error(
          `Error when checking if ${repoName} is a Git repo: ${error}`
        )
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

        logger.error(`Error when checking origin remote URL: ${error}`)
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

      logger.error(`Error when checking if ${repoName} exists: ${error}`)
      return new GitFileSystemError("An unknown error occurred")
    })

    return safeExistsSync(`${EFS_VOL_PATH}/${repoName}`)
      .andThen((isFolderExisting) => {
        if (!isFolderExisting) {
          // Return as an error to prevent further processing
          // The function will eventually return false
          return err<never, false>(false)
        }
        return ok(true)
      })
      .asyncAndThen(() => this.isGitInitialized(repoName))
      .andThen((isGitInitialized) => {
        if (!isGitInitialized) {
          return err<never, false>(false)
        }
        return ok(true)
      })
      .andThen(() => this.isOriginRemoteCorrect(repoName))
      .andThen((isOriginRemoteCorrect) => {
        if (!isOriginRemoteCorrect) {
          return err<never, false>(false)
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

  // Ensure that the repository is in the BRANCH_REF branch
  ensureCorrectBranch(repoName: string): ResultAsync<true, GitFileSystemError> {
    return ResultAsync.fromPromise(
      this.git
        .cwd(`${EFS_VOL_PATH}/${repoName}`)
        .revparse(["--abbrev-ref", "HEAD"]),
      (error) => {
        if (error instanceof GitError) {
          return new GitFileSystemError(error.message)
        }

        logger.error(`Error when getting current branch: ${error}`)
        return new GitFileSystemError("An unknown error occurred")
      }
    ).andThen((currentBranch) => {
      if (currentBranch !== BRANCH_REF) {
        return ResultAsync.fromPromise(
          this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).checkout(BRANCH_REF),
          (error) => {
            if (error instanceof GitError) {
              return new GitFileSystemError(error.message)
            }

            logger.error(`Error when checking out ${BRANCH_REF}: ${error}`)
            return new GitFileSystemError("An unknown error occurred")
          }
        ).andThen(() => okAsync<true>(true))
      }

      return okAsync<true>(true)
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
        .revparse([`HEAD:${filePath}`]),
      (error) => {
        if (error instanceof GitError) {
          return new GitFileSystemError(error.message)
        }

        logger.error(`Error when getting Git blob hash: ${error}`)
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

      logger.error(`Error when checking if ${repoName} exists: ${error}`)
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

              logger.error(`Error when cloning ${repoName}: ${error}`)
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

      return this.ensureCorrectBranch(repoName).andThen(() =>
        ResultAsync.fromPromise(
          this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).pull(),
          (error) => {
            // Full error message 1: Your configuration specifies to merge
            // with the ref 'refs/heads/staging' from the remote, but no
            // such ref was fetched.
            // Full error message 2: error: cannot lock ref
            // 'refs/remotes/origin/staging': is at <new sha> but expected <old sha>
            // Full error message 3: Cannot fast-forward your working tree.
            // Full error message 4: Need to specify how to reconcile divergent branches.
            // These are known errors that can be safely ignored
            if (
              error instanceof GitError &&
              (error.message.includes("but no such ref was fetched.") ||
                error.message.includes("error: cannot lock ref") ||
                error.message.includes(
                  "Cannot fast-forward your working tree"
                ) ||
                error.message.includes(
                  "Need to specify how to reconcile divergent branches"
                ))
            ) {
              return false
            }
            if (error instanceof GitError) {
              return new GitFileSystemError(error.message)
            }

            logger.error(`Error when pulling ${repoName}: ${error}`)
            return new GitFileSystemError("An unknown error occurred")
          }
        )
          .map(() => true)
          .orElse((error) => {
            if (typeof error === "boolean") {
              return okAsync(true)
            }
            return errAsync(error)
          })
          .map(() => `${EFS_VOL_PATH}/${repoName}`)
      )
    })
  }

  // Push the latest changes to upstream Git hosting provider
  push(repoName: string): ResultAsync<string, GitFileSystemError> {
    return this.isValidGitRepo(repoName).andThen((isValid) => {
      if (!isValid) {
        return errAsync(
          new GitFileSystemError(`Folder "${repoName}" is not a valid Git repo`)
        )
      }

      return this.ensureCorrectBranch(repoName).andThen(() =>
        ResultAsync.fromPromise(
          this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).push(),
          (error) => {
            if (error instanceof GitError) {
              return new GitFileSystemError(error.message)
            }

            logger.error(`Error when pushing ${repoName}: ${error}`)
            return new GitFileSystemError("An unknown error occurred")
          }
        ).map(() => `${EFS_VOL_PATH}/${repoName}`)
      )
    })
  }

  // Commit changes to the local Git repository
  commit(
    repoName: string,
    pathSpec: string[],
    userId: SessionDataProps["isomerUserId"],
    message: string
  ): ResultAsync<string, GitFileSystemError> {
    return this.isValidGitRepo(repoName).andThen((isValid) => {
      if (!isValid) {
        return errAsync(
          new GitFileSystemError(`Folder "${repoName}" is not a valid Git repo`)
        )
      }

      // Note: We only accept commits that change 1 file at once (pathSpec.length == 1)
      // Or commits that move/rename files (pathSpec.length == 2)
      if (pathSpec.length < 1 || pathSpec.length > 2) {
        return errAsync(
          new GitFileSystemError(
            `Invalid pathSpec length: ${pathSpec.length}. Expected 1 or 2`
          )
        )
      }

      const commitMessageObj: Omit<IsomerCommitMessage, "fileName"> &
        Partial<Pick<IsomerCommitMessage, "fileName">> = {
        message,
        userId,
      }

      if (pathSpec.length === 1) {
        commitMessageObj.fileName = pathSpec[0].split("/").pop()
      }

      const commitMessage = JSON.stringify(commitMessageObj)

      return this.ensureCorrectBranch(repoName)
        .andThen(() =>
          ResultAsync.fromPromise(
            this.git
              .cwd(`${EFS_VOL_PATH}/${repoName}`)
              .add(pathSpec)
              .commit(commitMessage),
            (error) => {
              if (error instanceof GitError) {
                return new GitFileSystemError(error.message)
              }

              logger.error(`Error when committing ${repoName}: ${error}`)
              return new GitFileSystemError("An unknown error occurred")
            }
          )
        )
        .map((commitResult) => commitResult.commit)
    })
  }

  // TODO: Creates either directory or file
  // ResourceDirectoryService used this to create a directory + file at the same time
  create() {}

  // Read the contents of a file
  read(
    repoName: string,
    filePath: string
  ): ResultAsync<GitFile, GitFileSystemError | NotFoundError> {
    return combine([
      ResultAsync.fromPromise(
        fs.promises.readFile(
          `${EFS_VOL_PATH}/${repoName}/${filePath}`,
          "utf-8"
        ),
        (error) => {
          if (error instanceof Error && error.message.includes("ENOENT")) {
            return new NotFoundError("File does not exist")
          }
          if (error instanceof Error) {
            return new GitFileSystemError(error.message)
          }

          logger.error(`Error when reading ${filePath}: ${error}`)
          return new GitFileSystemError("An unknown error occurred")
        }
      ),
      this.getGitBlobHash(repoName, filePath),
    ]).map((contentAndHash) => {
      const [content, sha] = contentAndHash
      const result: GitFile = {
        content,
        sha,
      }
      return result
    })
  }

  // Read the contents of a directory
  listDirectoryContents(
    repoName: string,
    directoryPath: string
  ): ResultAsync<GitDirectoryItem[], GitFileSystemError | NotFoundError> {
    return ResultAsync.fromPromise(
      fs.promises.stat(`${EFS_VOL_PATH}/${repoName}/${directoryPath}`),
      (error) => {
        if (error instanceof Error && error.message.includes("ENOENT")) {
          return new NotFoundError("Directory does not exist")
        }
        if (error instanceof Error) {
          return new GitFileSystemError(error.message)
        }

        logger.error(`Error when getting ${directoryPath} stats: ${error}`)
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

            logger.error(`Error when reading ${directoryPath}: ${error}`)
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

  isGitLocalDiskRawCommitData(
    commit: unknown
  ): commit is GitLocalDiskRawCommitData {
    return (
      !!commit &&
      (commit as GitLocalDiskRawCommitData).author_name !== undefined &&
      (commit as GitLocalDiskRawCommitData).author_email !== undefined &&
      (commit as GitLocalDiskRawCommitData).date !== undefined &&
      (commit as GitLocalDiskRawCommitData).message !== undefined &&
      (commit as GitLocalDiskRawCommitData).hash !== undefined
    )
  }

  getLatestCommitOfBranch(
    repoName: string,
    branchName: string
  ): ResultAsync<GitHubCommitData, GitFileSystemError> {
    return ResultAsync.fromPromise(
      this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).log([branchName]),
      (error) => {
        if (error instanceof GitError) {
          return new GitFileSystemError(error.message)
        }
        logger.error(`Error when getting latest commit of branch: ${error}`)
        return new GitFileSystemError("An unknown error occurred")
      }
    ).andThen((logSummary) => {
      const possibleCommit = logSummary.latest
      console.log(`POSSIBLE COMMIT`, possibleCommit)
      if (this.isGitLocalDiskRawCommitData(possibleCommit)) {
        return okAsync({
          author: {
            name: possibleCommit.author_name,
            email: possibleCommit.author_email,
            date: possibleCommit.date,
          },
          message: possibleCommit.message,
          sha: possibleCommit.hash,
        })
      }
      return errAsync(
        new GitFileSystemError(
          "Unable to retrieve latest commit info from disk"
        )
      )
    })
  }
}
