import fs from "fs"
import path from "path"

import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow"
import {
  CleanOptions,
  GitError,
  SimpleGit,
  DefaultLogFields,
  LogResult,
  ListLogLine,
} from "simple-git"

import logger from "@logger/logger"

import { BadRequestError } from "@errors/BadRequestError"
import { ConflictError } from "@errors/ConflictError"
import GitFileSystemError from "@errors/GitFileSystemError"
import GitFileSystemNeedsRollbackError from "@errors/GitFileSystemNeedsRollbackError"
import { NotFoundError } from "@errors/NotFoundError"

import tracer from "@utils/tracer"

import {
  EFS_VOL_PATH_STAGING,
  EFS_VOL_PATH_STAGING_LITE,
  ISOMER_GITHUB_ORG_NAME,
  STAGING_BRANCH,
  STAGING_LITE_BRANCH,
} from "@constants/constants"

import { SessionDataProps } from "@root/classes"
import config from "@root/config/config"
import { MediaTypeError } from "@root/errors/MediaTypeError"
import { MediaFileOutput } from "@root/types"
import { GitHubCommitData } from "@root/types/commitData"
import type {
  DirectoryContents,
  GitCommitResult,
  GitDirectoryItem,
  GitFile,
} from "@root/types/gitfilesystem"
import type { IsomerCommitMessage } from "@root/types/github"
import { ALLOWED_FILE_EXTENSIONS } from "@root/utils/file-upload-utils"
import { getPaginatedDirectoryContents } from "@root/utils/files"

// methods that do not need to be wrapped for instrumentation
const METHOD_INSTRUMENTATION_BLACKLIST = [
  // constructor cannot be instrumented with tracer.wrap() because it would lose invocation with 'new'
  "constructor",

  // these methods only check and return env vars, tracking spans for them is useless and wasteful
  "getEfsVolPathFromBranch",
  "getEfsVolPath",
  "isStagingFromBranchName",
]

export default class GitFileSystemService {
  private readonly git: SimpleGit

  constructor(git: SimpleGit) {
    this.git = git

    // Below is a "dirty" hack to instrument ALL methods of GitFileSystemService
    // all methods will create spans for visibility in traces

    /* eslint-disable no-restricted-syntax */
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    for (const methodName of Object.getOwnPropertyNames(
      GitFileSystemService.prototype
    )) {
      // eslint-disable-next-line no-continue
      if (METHOD_INSTRUMENTATION_BLACKLIST.includes(methodName)) continue

      // @ts-ignore
      const method = this[methodName]
      if (typeof method === "function") {
        // @ts-ignore
        this[methodName] = tracer.wrap(
          `GitFileSystem.${methodName}`,
          method.bind(this)
        )
      }
    }
    /* eslint-enable @typescript-eslint/ban-ts-comment */
    /* eslint-enable no-restricted-syntax */
  }

  private getEfsVolPathFromBranch(branchName: string): string {
    // need to use includes as it also checks for "origin/<branch_name>"
    return branchName.includes(STAGING_LITE_BRANCH)
      ? EFS_VOL_PATH_STAGING_LITE
      : EFS_VOL_PATH_STAGING
  }

  private getEfsVolPath(isStaging: boolean): string {
    return isStaging ? EFS_VOL_PATH_STAGING : EFS_VOL_PATH_STAGING_LITE
  }

  private isStagingFromBranchName(branchName: string): boolean {
    return branchName !== STAGING_LITE_BRANCH
  }

  /**
   * NOTE: We can do concurrent writes to the staging branch and the staging lite branch
   * since they exist in different folders.
   *
   * @param repoName name of repo in remote
   * @param isStaging boolean to show staging vs staging-lite
   * @returns existence of lock
   */
  hasGitFileLock(
    repoName: string,
    isStaging: boolean
  ): ResultAsync<boolean, GitFileSystemError> {
    const gitFileLockPath = ".git/index.lock"
    return this.getFilePathStats(repoName, gitFileLockPath, isStaging)
      .andThen(() => ok(true))
      .orElse((error) => {
        if (error instanceof NotFoundError) {
          return ok(false)
        }
        logger.error(
          `Error when checking for git file lock for ${repoName}: ${error}`
        )
        return err(error)
      })
  }

  isDefaultLogFields(logFields: unknown): logFields is DefaultLogFields {
    const c = logFields as DefaultLogFields
    return (
      !!logFields &&
      typeof logFields === "object" &&
      typeof c.author_name === "string" &&
      typeof c.author_email === "string" &&
      typeof c.date === "string" &&
      typeof c.message === "string" &&
      typeof c.hash === "string"
    )
  }

  isGitInitialized(
    repoName: string,
    isStaging: boolean
  ): ResultAsync<boolean, GitFileSystemError> {
    const repoPath = isStaging
      ? `${EFS_VOL_PATH_STAGING}/${repoName}`
      : `${EFS_VOL_PATH_STAGING_LITE}/${repoName}`
    return ResultAsync.fromPromise(
      this.git.cwd({ path: `${repoPath}`, root: false }).checkIsRepo(),
      (error) => {
        logger.error(
          `Error when checking if ${repoName} is a Git repo: ${error}`
        )

        if (error instanceof GitError) {
          return new GitFileSystemError(
            "Unable to determine if directory is Git repo"
          )
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    )
  }

  isOriginRemoteCorrect(
    repoName: string,
    isStaging: boolean
  ): ResultAsync<boolean, GitFileSystemError> {
    const originUrl = `git@github.com:${ISOMER_GITHUB_ORG_NAME}/${repoName}.git`
    const repoPath = isStaging
      ? `${EFS_VOL_PATH_STAGING}/${repoName}`
      : `${EFS_VOL_PATH_STAGING_LITE}/${repoName}`
    return ResultAsync.fromPromise(
      this.git
        .cwd({ path: repoPath, root: false })
        .remote(["get-url", "origin"]),
      (error) => {
        logger.error(`Error when checking origin remote URL: ${error}`)

        if (error instanceof GitError) {
          return new GitFileSystemError("Unable to determine origin remote URL")
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    ).map((remoteUrl) => !!remoteUrl && remoteUrl.trim() === originUrl)
  }

  // Determine if the folder is a valid Git repository
  isValidGitRepo(
    repoName: string,
    branchName: string
  ): ResultAsync<boolean, GitFileSystemError> {
    const isStaging = this.isStagingFromBranchName(branchName)

    return this.getFilePathStats(repoName, "", isStaging)
      .andThen((stats) => {
        if (!stats.isDirectory()) {
          // Return as an error to prevent further processing
          // The function will eventually return false
          logger.error(
            `Repo: ${repoName}, branch: ${branchName} is not a directory`
          )
          return errAsync(false)
        }
        return okAsync(true)
      })
      .orElse((error) => {
        if (error instanceof NotFoundError) {
          logger.error(
            `Repo: ${repoName}, branch: ${branchName} is not found ${error}`
          )
          return errAsync(false)
        }
        return errAsync(error)
      })
      .andThen(() => this.isGitInitialized(repoName, isStaging))
      .andThen((isGitInitialized) => {
        if (!isGitInitialized) {
          logger.error(
            `Repo: ${repoName}, branch: ${branchName} does not have git initialised`
          )
          return err<never, false>(false)
        }
        return ok(true)
      })
      .andThen(() => this.isOriginRemoteCorrect(repoName, isStaging))
      .andThen((isOriginRemoteCorrect) => {
        if (!isOriginRemoteCorrect) {
          logger.error(
            `Repo: ${repoName}, branch: ${branchName} does not have correct origin remote`
          )
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

  // Determine if the given branch is present in the local repo copy
  isLocalBranchPresent(
    repoName: string,
    branchName: string
  ): ResultAsync<boolean, GitFileSystemError> {
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    return ResultAsync.fromPromise(
      this.git
        .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
        .branchLocal(),
      (error) => {
        logger.error(
          `Unable to get the list of local branches in ${efsVolPath}/${repoName}: ${JSON.stringify(
            error
          )}`
        )

        if (error instanceof GitError) {
          return new GitFileSystemError(
            "Unable to get the list of local branches"
          )
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    ).map((result) => result.all.includes(branchName))
  }

  // Ensure that the repository is in the specified branch
  ensureCorrectBranch(
    repoName: string,
    branchName: string
  ): ResultAsync<true, GitFileSystemError> {
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    return ResultAsync.fromPromise(
      this.git
        .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
        .revparse(["--abbrev-ref", "HEAD"]),
      (error) => {
        logger.error(`Error when getting current branch: ${error}`)

        if (error instanceof GitError) {
          return new GitFileSystemError("Unable to determine current branch")
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    ).andThen((currentBranch) => {
      if (currentBranch !== branchName) {
        return ResultAsync.fromPromise(
          this.git
            .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
            .checkout(branchName),
          (error) => {
            logger.error(`Error when checking out ${branchName}: ${error}`)

            if (error instanceof GitError) {
              return new GitFileSystemError("Unable to checkout branch")
            }

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
    filePath: string,
    isStaging: boolean
  ): ResultAsync<string, GitFileSystemError | NotFoundError> {
    const efsVolPath = isStaging
      ? EFS_VOL_PATH_STAGING
      : EFS_VOL_PATH_STAGING_LITE
    return ResultAsync.fromPromise(
      this.git
        .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
        .revparse([`HEAD:${filePath}`]),
      (error) => {
        logger.error(
          `Error when getting Git blob hash: ${error} when trying to access ${efsVolPath}/${repoName}`
        )

        if (error instanceof GitError) {
          // NOTE: While some path can be potentially normalised by Git (eg. images//path.png),
          // it is not guaranteed to exist in HEAD. We simply return a not found error in this case.
          if (
            error.message.includes("fatal: path") &&
            error.message.includes("exists on disk, but not in 'HEAD'")
          ) {
            return new NotFoundError("File/Directory does not exist")
          }
          return new GitFileSystemError("Unable to determine Git blob hash")
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    )
  }

  /**
   * NOTE: staging and staging-lite are stored in different folders,
   * and hence we need to specify which folder to look in
   *
   * @param repoName name of repo in remote
   * @param filePath file path
   * @param isStaging boolean to show staging vs staging-lite
   * @returns filesystem stats of a file or directory
   */
  getFilePathStats(
    repoName: string,
    filePath: string,
    isStaging: boolean
  ): ResultAsync<fs.Stats, NotFoundError | GitFileSystemError> {
    const efsVolPath = isStaging
      ? EFS_VOL_PATH_STAGING
      : EFS_VOL_PATH_STAGING_LITE
    return ResultAsync.fromPromise(
      fs.promises.stat(`${efsVolPath}/${repoName}/${filePath}`),
      (error) => {
        if (error instanceof Error && error.message.includes("ENOENT")) {
          return new NotFoundError("File/Directory does not exist")
        }

        logger.error(`Error when reading ${filePath}: ${error}`)

        if (error instanceof Error) {
          return new GitFileSystemError("Unable to read file/directory")
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    )
  }

  /**
   * Wrapper over `git diff --name-only` that also creates `master` branch if it does not exist.
   */
  getFilesChanged(repoName: string): ResultAsync<string[], GitFileSystemError> {
    return this.createLocalTrackingBranchIfNotExists(
      repoName,
      "master"
    ).andThen(() => {
      const efsVolPath = this.getEfsVolPathFromBranch("staging")
      return ResultAsync.fromPromise(
        this.git
          .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
          .diff(["master..staging", "--name-only"]),
        (error) => {
          logger.error(
            `Error when getting diff files between master and staging: ${error}, when trying to access ${efsVolPath}/${repoName}`
          )

          if (error instanceof GitError) {
            return new GitFileSystemError(
              "Unable to retrieve git diff info from disk"
            )
          }

          return new GitFileSystemError("An unknown error occurred")
        }
      ).map((files) =>
        files
          .trim()
          .split("\n")
          .filter((file) => file !== "")
      )
    })
  }

  /**
   * Get latest commit for a file path on a branch (including deleted files)
   */
  getLatestCommitOfPath(
    repoName: string,
    path: string,
    branch = "staging"
  ): ResultAsync<DefaultLogFields & ListLogLine, GitFileSystemError> {
    const efsVolPath = this.getEfsVolPathFromBranch(branch)
    return ResultAsync.fromPromise(
      this.git
        .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
        // -1 to return latest commit only, -- to get logs even for deleted files
        .log(["-1", branch, "--", path]),
      (error) => {
        logger.error(
          `Error when getting latest commit for "${path}" on "${branch}": ${error}, when trying to access ${efsVolPath}/${repoName}`
        )

        if (error instanceof GitError) {
          return new GitFileSystemError(
            "Unable to retrieve latest log info from disk"
          )
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    ).andThen((logs) => {
      if (logs.latest === null) {
        return errAsync(
          new GitFileSystemError(
            `No commit was found for "${path}" on "${branch}"`
          )
        )
      }
      return okAsync(logs.latest)
    })
  }

  // Get the Git log of a particular branch
  getGitLog(
    repoName: string,
    branchName: string,
    maxCount = 1
  ): ResultAsync<LogResult<DefaultLogFields>, GitFileSystemError> {
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)

    if (!Number.isInteger(maxCount) || maxCount < 1) {
      return errAsync(
        new GitFileSystemError(`Invalid maxCount value supplied: ${maxCount}`)
      )
    }

    return ResultAsync.fromPromise(
      this.git
        .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
        .log([`--max-count=${maxCount}`, branchName]),

      (error) => {
        logger.error(
          `Error when getting Git log of "${branchName}" branch: ${error}, when trying to access ${efsVolPath}/${repoName} for ${branchName}`
        )

        if (error instanceof GitError) {
          return new GitFileSystemError(
            "Unable to retrieve branch log info from disk"
          )
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    )
  }

  // Reset the state of the local Git repository to a specific commit
  rollback(
    repoName: string,
    commitSha: string,
    branchName: string
  ): ResultAsync<true, GitFileSystemError> {
    logger.warn(
      `Rolling repo ${repoName} back to ${commitSha} for ${branchName}`
    )
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    return ResultAsync.fromPromise(
      this.git
        .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
        .reset(["--hard", commitSha])
        .clean(CleanOptions.FORCE + CleanOptions.RECURSIVE),
      (error) => {
        logger.error(`Error when rolling back to ${commitSha}: ${error}`)

        if (error instanceof GitError) {
          return new GitFileSystemError("Unable to rollback to original state")
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    ).andThen(() => okAsync<true>(true))
  }

  // Clone repository from upstream Git hosting provider
  clone(repoName: string): ResultAsync<string, GitFileSystemError> {
    return ResultAsync.combine([
      this.cloneBranch(repoName, true),
      this.cloneBranch(repoName, false),
    ]).andThen(([stagingPath, _]) =>
      // staging lite path not needed, promises are resolved in order
      okAsync(stagingPath)
    )
  }

  cloneBranch(
    repoName: string,
    isStaging: boolean
  ): ResultAsync<string, GitFileSystemError> {
    const originUrl = `git@github.com:${ISOMER_GITHUB_ORG_NAME}/${repoName}.git`
    const efsVolPath = this.getEfsVolPath(isStaging)
    const branch = isStaging ? STAGING_BRANCH : STAGING_LITE_BRANCH

    return this.getFilePathStats(repoName, "", isStaging)
      .andThen((stats) => ok(stats.isDirectory()))
      .orElse((error) => {
        if (error instanceof NotFoundError) {
          return ok(false)
        }
        return err(error)
      })
      .andThen((isDirectory) => {
        if (!isDirectory) {
          const clonePromise = isStaging
            ? this.git
                .clone(originUrl, `${efsVolPath}/${repoName}`)
                .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
                .checkout(branch)
            : this.git
                .clone(originUrl, `${efsVolPath}/${repoName}`, [
                  "--branch",
                  branch,
                  "--single-branch",
                ])
                .cwd({ path: `${efsVolPath}/${repoName}`, root: false })

          return ResultAsync.fromPromise(clonePromise, (error) => {
            logger.error(`Error when cloning ${repoName}: ${error}`)

            if (error instanceof GitError) {
              return new GitFileSystemError(
                isStaging
                  ? `Unable to clone whole repo for ${repoName}`
                  : `Unable to clone staging lite branch for ${repoName}`
              )
            }

            return new GitFileSystemError("An unknown error occurred")
          }).map(() => `${efsVolPath}/${repoName}`)
        }

        return this.isGitInitialized(repoName, isStaging)
          .andThen((isGitInitialized) => {
            if (!isGitInitialized) {
              return errAsync(
                new GitFileSystemError(
                  `An existing folder "${repoName}" exists ${
                    isStaging ? "in staging" : "in staging lite"
                  } but is not a Git repo`
                )
              )
            }
            return okAsync(true)
          })
          .andThen(() => this.isOriginRemoteCorrect(repoName, isStaging))
          .andThen((isOriginRemoteCorrect) => {
            if (!isOriginRemoteCorrect) {
              return errAsync(
                new GitFileSystemError(
                  `An existing folder "${repoName}" exists ${
                    isStaging ? "in staging" : "in staging lite"
                  } but is not the correct Git repo`
                )
              )
            }
            return okAsync(`${efsVolPath}/${repoName}`)
          })
      })
  }

  fastForwardMaster(
    repoName: string
  ): ResultAsync<boolean, GitFileSystemError> {
    const efsVolPath = this.getEfsVolPathFromBranch("master")
    return this.isValidGitRepo(repoName, "master").andThen((isValid) => {
      if (!isValid) {
        return errAsync(
          new GitFileSystemError(
            `Folder "${repoName}" for EFS vol path: "${efsVolPath}" is not a valid Git repo`
          )
        )
      }
      return this.createLocalTrackingBranchIfNotExists(repoName, "master")
        .andThen(() =>
          ResultAsync.fromPromise(
            this.git
              .cwd({ path: path.join(efsVolPath, repoName), root: false })
              // fast forwards master to origin/master without requiring checkout
              .fetch(["origin", "master:master"]),
            (error) => {
              logger.error(
                `Error when fast forwarding master for ${repoName}: ${error}`
              )
              if (error instanceof GitError) {
                return new GitFileSystemError("Unable to fetch master branch")
              }
              return new GitFileSystemError("An unknown error occurred")
            }
          )
        )
        .map(() => true)
    })
  }

  // Pull the latest changes from upstream Git hosting provider
  // TODO: Pulling is a very expensive operation, should find a way to optimise
  pull(
    repoName: string,
    branchName: string
  ): ResultAsync<boolean, GitFileSystemError> {
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    return this.isValidGitRepo(repoName, branchName).andThen((isValid) => {
      if (!isValid) {
        return errAsync(
          new GitFileSystemError(
            `Folder "${repoName}" for EFS vol path: "${efsVolPath}" is not a valid Git repo`
          )
        )
      }

      return this.ensureCorrectBranch(repoName, branchName).andThen(() =>
        ResultAsync.fromPromise(
          this.git
            .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
            .pull(),
          (error) => {
            logger.error(
              `Error when pulling ${branchName} for ${repoName}: ${error}`
            )

            if (error instanceof GitError) {
              return new GitFileSystemError(
                "Unable to pull latest changes of repo"
              )
            }

            return new GitFileSystemError("An unknown error occurred")
          }
        )
          .map(() => true)
          .orElse((error) => errAsync(error))
      )
    })
  }

  // Push the latest changes to upstream Git hosting provider
  push(
    repoName: string,
    branchName: string,
    isForce = false
  ): ResultAsync<string, GitFileSystemError> {
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    return this.isValidGitRepo(repoName, branchName).andThen((isValid) => {
      if (!isValid) {
        return errAsync(
          new GitFileSystemError(
            `Folder "${repoName}" for EFS vol path: "${efsVolPath}" is not a valid Git repo`
          )
        )
      }
      const gitOptions = `origin ${branchName}`.split(" ")
      return this.ensureCorrectBranch(repoName, branchName)
        .andThen(() =>
          ResultAsync.fromPromise(
            isForce
              ? this.git
                  .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
                  .push([...gitOptions, "--force"])
              : this.git
                  .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
                  .push(gitOptions),
            (error) => {
              logger.error(
                `Error when pushing ${repoName}. Retrying git push operation for the first time...`
              )

              if (error instanceof GitError) {
                return new GitFileSystemError(
                  "Unable to push latest changes of repo"
                )
              }

              return new GitFileSystemError("An unknown error occurred")
            }
          )
        )
        .orElse(() =>
          // Retry push once
          ResultAsync.fromPromise(
            isForce
              ? this.git
                  .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
                  .push([...gitOptions, "--force"])
              : this.git
                  .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
                  .push(gitOptions),
            (error) => {
              logger.error(
                `Error when pushing ${repoName}. Retrying git push operation for the second time...`
              )

              if (error instanceof GitError) {
                return new GitFileSystemError(
                  "Unable to push latest changes of repo"
                )
              }

              return new GitFileSystemError("An unknown error occurred")
            }
          )
        )
        .orElse(() =>
          // Retry push twice
          // TODO: To eliminate duplicate code by using a backoff or retry package
          // As a last resort, we do a force push to GitHub as EFS is the source of truth
          {
            logger.info(
              `Performing a force push to GitHub as earlier retries have failed for ${repoName}`
            )
            return ResultAsync.fromPromise(
              this.git
                .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
                .push([...gitOptions, "--force"]),
              (error) => {
                logger.error(
                  `Both retries for git push have failed. Error when pushing ${repoName}: ${error}`
                )

                if (error instanceof GitError) {
                  return new GitFileSystemError(
                    "Unable to push latest changes of repo"
                  )
                }

                return new GitFileSystemError("An unknown error occurred")
              }
            )
          }
        )
        .map(() => `${efsVolPath}/${repoName}`)
    })
  }

  // Commit changes to the local Git repository
  commit(
    repoName: string,
    pathSpec: string[],
    userId: SessionDataProps["isomerUserId"],
    message: string,
    branchName: string,
    skipGitAdd?: boolean
  ): ResultAsync<string, GitFileSystemError | GitFileSystemNeedsRollbackError> {
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    return this.isValidGitRepo(repoName, branchName).andThen((isValid) => {
      if (!isValid) {
        return errAsync(
          new GitFileSystemError(
            `Folder "${repoName}" for EFS vol path: "${efsVolPath}" is not a valid Git repo`
          )
        )
      }

      if (pathSpec.length < 1) {
        return errAsync(
          new GitFileSystemError(
            `Invalid pathSpec length: ${pathSpec.length}. Expected 1 or more`
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

      return this.ensureCorrectBranch(repoName, branchName)
        .andThen(() => {
          if (skipGitAdd) {
            // This is necessary when we have performed a git mv
            return okAsync(true)
          }

          // Note: We need to add files sequentially due to the Git lock
          return pathSpec.reduce(
            (acc, curr) =>
              acc.andThen(() =>
                ResultAsync.fromPromise(
                  this.git
                    .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
                    .add(curr),
                  (error) => {
                    logger.error(
                      `Error when Git adding files to ${repoName}: ${error}`
                    )

                    if (error instanceof GitError) {
                      return new GitFileSystemNeedsRollbackError(
                        "Unable to commit changes"
                      )
                    }

                    return new GitFileSystemNeedsRollbackError(
                      "An unknown error occurred"
                    )
                  }
                )
              ),
            okAsync<unknown, GitFileSystemNeedsRollbackError>(undefined)
          )
        })
        .andThen(() =>
          ResultAsync.fromPromise(
            this.git
              .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
              .commit(commitMessage),
            (error) => {
              logger.error(`Error when committing ${repoName}: ${error}`)

              if (error instanceof GitError) {
                return new GitFileSystemNeedsRollbackError(
                  "Unable to commit changes"
                )
              }

              return new GitFileSystemNeedsRollbackError(
                "An unknown error occurred"
              )
            }
          )
        )
        .map((commitResult) => commitResult.commit)
    })
  }

  // Creates a file and the associated directory if it doesn't exist
  create(
    repoName: string,
    userId: string,
    content: string,
    directoryName: string,
    fileName: string,
    encoding: "utf-8" | "base64" = "utf-8",
    branchName: string
  ): ResultAsync<
    GitCommitResult,
    ConflictError | GitFileSystemError | NotFoundError
  > {
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    const filePath = directoryName ? `${directoryName}/${fileName}` : fileName
    const pathToEfsDir = `${efsVolPath}/${repoName}/${directoryName}/`
    const pathToEfsFile = `${efsVolPath}/${repoName}/${filePath}`
    const encodedContent = content
    let oldStateSha = ""

    return this.getLatestCommitOfBranch(repoName, branchName)
      .andThen((latestCommit) => {
        const { sha } = latestCommit
        if (!sha) {
          return errAsync(new GitFileSystemError("An unknown error occurred"))
        }
        oldStateSha = sha
        return okAsync(true)
      })
      .andThen(() =>
        this.getFilePathStats(
          repoName,
          directoryName,
          branchName !== STAGING_LITE_BRANCH
        )
      )
      .andThen((stats) => {
        if (stats.isDirectory()) return ok(true)
        return err(new NotFoundError())
      })
      .orElse((error) => {
        if (error instanceof NotFoundError) {
          // Create directory if it does not already exist
          return ResultAsync.fromPromise(
            fs.promises.mkdir(pathToEfsDir),
            (mkdirErr) => {
              logger.error(
                `Error occurred while creating ${pathToEfsDir} directory: ${mkdirErr}`
              )
              return new GitFileSystemError("An unknown error occurred")
            }
          ).map(() => true)
        }
        return err(error)
      })
      .andThen(() =>
        this.getFilePathStats(
          repoName,
          filePath,
          branchName !== STAGING_LITE_BRANCH
        )
      )
      .andThen((stats) => {
        if (stats.isFile())
          return err(
            new ConflictError(
              `File ${filePath} already exists in repo ${repoName}`
            )
          )
        return ok(true)
      })
      .orElse((error) => {
        if (error instanceof NotFoundError) {
          return ok(true)
        }
        return err(error)
      })
      .andThen(() =>
        ResultAsync.fromPromise(
          fs.promises.writeFile(pathToEfsFile, encodedContent, encoding),
          (error) => {
            logger.error(`Error when creating ${filePath}: ${error}`)
            if (error instanceof Error) {
              return new GitFileSystemNeedsRollbackError(error.message)
            }
            return new GitFileSystemNeedsRollbackError(
              "An unknown error occurred"
            )
          }
        )
      )
      .andThen(() =>
        this.commit(
          repoName,
          [pathToEfsFile],
          userId,
          `Create file: ${filePath}`,
          branchName
        )
      )
      .map((commit) => ({ newSha: commit }))
      .orElse((error) => {
        if (error instanceof GitFileSystemNeedsRollbackError) {
          return this.rollback(repoName, oldStateSha, branchName).andThen(() =>
            errAsync(new GitFileSystemError(error.message))
          )
        }

        return errAsync(error)
      })
  }

  // Read the contents of a file
  read(
    repoName: string,
    filePath: string,
    encoding: "utf-8" | "base64" = "utf-8"
  ): ResultAsync<GitFile, GitFileSystemError | NotFoundError> {
    const defaultEfsVolPath = EFS_VOL_PATH_STAGING
    return ResultAsync.combine([
      ResultAsync.fromPromise(
        fs.promises.readFile(
          `${defaultEfsVolPath}/${repoName}/${filePath}`,
          encoding
        ),
        (error) => {
          if (error instanceof Error && error.message.includes("ENOENT")) {
            return new NotFoundError("File does not exist")
          }

          logger.error(`Error when reading ${filePath}: ${error}`)

          if (error instanceof Error) {
            return new GitFileSystemError("Unable to read file")
          }

          return new GitFileSystemError("An unknown error occurred")
        }
      ),
      this.getGitBlobHash(repoName, filePath, true),
    ]).map((contentAndHash) => {
      const [content, sha] = contentAndHash
      const result: GitFile = {
        content,
        sha,
      }
      return result
    })
  }

  getFileExtension(fileName: string): Result<string, MediaTypeError> {
    const parts = fileName.split(".")
    if (parts.length > 1) {
      return ok(parts[parts.length - 1])
    }
    return err(new MediaTypeError("Unable to find file extension")) // No extension found
  }

  getMimeType(fileExtension: string): Result<string, MediaTypeError> {
    if (!ALLOWED_FILE_EXTENSIONS.includes(fileExtension.toLowerCase())) {
      return err(
        new MediaTypeError(`Unsupported file extension: ${fileExtension} found`)
      )
    }
    switch (fileExtension) {
      case "svg":
        return ok("image/svg+xml")
      case "ico":
        return ok("image/vnd.microsoft.icon")
      case "jpg":
        return ok("image/jpeg")
      case "tif":
        return ok("image/tiff")
      default:
        return ok(`image/${fileExtension}`)
    }
  }

  readMediaFile(
    siteName: string,
    directoryName: string,
    fileName: string
  ): ResultAsync<
    MediaFileOutput,
    GitFileSystemError | MediaTypeError | NotFoundError
  > {
    return this.getFileExtension(fileName)
      .andThen((fileExt) => this.getMimeType(fileExt))
      .asyncAndThen((mimeType) =>
        ResultAsync.combine([
          okAsync(mimeType),
          this.getFilePathStats(siteName, `${directoryName}/${fileName}`, true),
          this.read(siteName, `${directoryName}/${fileName}`, "base64"),
        ])
      )
      .andThen((combineResult) => {
        const [mimeType, stats, file] = combineResult
        const fileType = "file" as const
        const dataUrlPrefix = `data:${mimeType};base64`

        return okAsync({
          name: fileName,
          sha: file.sha,
          mediaUrl: `${dataUrlPrefix},${file.content}`,
          mediaPath: `${directoryName}/${fileName}`,
          type: fileType,
          addedTime: stats.ctimeMs,
          size: stats.size,
        })
      })
  }

  // Read the contents of a directory
  listDirectoryContents(
    repoName: string,
    directoryPath: string,
    branchName: string,
    includeSha = true
  ): ResultAsync<GitDirectoryItem[], GitFileSystemError | NotFoundError> {
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    const isStaging = this.isStagingFromBranchName(branchName)

    return this.getFilePathStats(
      repoName,
      directoryPath,
      branchName !== STAGING_LITE_BRANCH
    )
      .andThen((stats) => {
        if (!stats.isDirectory()) {
          return errAsync(
            new GitFileSystemError(
              `Path "${directoryPath}" is not a valid directory in repo "${repoName}"`
            )
          )
        }
        return okAsync(true)
      })
      .andThen(() =>
        ResultAsync.fromPromise(
          fs.promises.readdir(`${efsVolPath}/${repoName}/${directoryPath}`, {
            withFileTypes: true,
          }),
          (error) => {
            logger.error(`Error when reading ${directoryPath}: ${error}`)

            if (error instanceof Error) {
              return new GitFileSystemError("Unable to read directory")
            }

            return new GitFileSystemError("An unknown error occurred")
          }
        )
      )
      .andThen((directoryContents) => {
        const IGNORED_FILES = [".git"]
        const filteredDirectoryContents = directoryContents.filter(
          (directoryItem) => !IGNORED_FILES.includes(directoryItem.name)
        )
        const resultAsyncs = filteredDirectoryContents.map((directoryItem) => {
          const isDirectory = directoryItem.isDirectory()
          const { name } = directoryItem
          const path = directoryPath === "" ? name : `${directoryPath}/${name}`
          const type = isDirectory ? "dir" : "file"

          if (includeSha) {
            return this.getGitBlobHash(repoName, path, isStaging)
              .orElse(() => okAsync(""))
              .andThen((sha) =>
                ResultAsync.combine([
                  okAsync(sha),
                  this.getFilePathStats(repoName, path, isStaging),
                ])
              )
              .andThen((shaAndStats) => {
                const [sha, stats] = shaAndStats
                const result: GitDirectoryItem = {
                  name,
                  type,
                  sha,
                  path,
                  size: type === "dir" ? 0 : stats.size,
                  addedTime: stats.ctimeMs,
                }

                return okAsync(result)
              })
          }
          return this.getFilePathStats(repoName, path, isStaging).andThen(
            (stats) => {
              const result: GitDirectoryItem = {
                name,
                type,
                path,
                size: type === "dir" ? 0 : stats.size,
                addedTime: stats.ctimeMs,
              }
              return okAsync(result)
            }
          )
        })

        return ResultAsync.combine(resultAsyncs)
      })
  }

  listPaginatedDirectoryContents(
    repoName: string,
    directoryPath: string,
    branchName: string,
    page = 0,
    limit = 0,
    search = ""
  ): ResultAsync<DirectoryContents, GitFileSystemError | NotFoundError> {
    const isStaging = this.isStagingFromBranchName(branchName)

    return this.listDirectoryContents(
      repoName,
      directoryPath,
      branchName,
      false
    )
      .andThen((directoryContents) =>
        okAsync(
          getPaginatedDirectoryContents(directoryContents, page, limit, search)
        )
      )
      .andThen((paginatedDirectoryContents) => {
        const directories = paginatedDirectoryContents.directories.map(
          (directory) =>
            this.getGitBlobHash(repoName, directory.path, isStaging)
              .orElse(() => okAsync(""))
              .andThen((sha) => {
                const result: GitDirectoryItem = {
                  ...directory,
                  sha,
                }

                return okAsync(result)
              })
        )

        const files = paginatedDirectoryContents.files.map((file) =>
          this.getGitBlobHash(repoName, file.path, isStaging)
            .orElse(() => okAsync(""))
            .andThen((sha) => {
              const result: GitDirectoryItem = {
                ...file,
                sha,
              }

              return okAsync(result)
            })
        )

        return ResultAsync.combine([
          ResultAsync.combine(directories),
          ResultAsync.combine(files),
          okAsync(paginatedDirectoryContents.total),
        ])
      })
      .andThen(([directories, files, total]) =>
        // Note: The sha is empty if the file is not tracked by Git
        // This may result in the number of files being less than the requested
        // limit (if limit is greater than 0), but the trade-off is acceptable
        // here because the user can use pagination to get the next set of files,
        // which is guaranteed to be a fresh set of files
        okAsync({
          directories: directories.filter((directory) => directory.sha !== ""),
          files: files.filter((file) => file.sha !== ""),
          total,
        })
      )
  }

  // Update the contents of a file
  update(
    repoName: string,
    filePath: string,
    fileContent: string,
    oldSha: string,
    userId: SessionDataProps["isomerUserId"],
    branchName: string
  ): ResultAsync<string, GitFileSystemError | NotFoundError | ConflictError> {
    let oldStateSha = ""
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    const isStaging = this.isStagingFromBranchName(branchName)
    return this.getLatestCommitOfBranch(repoName, branchName)
      .andThen((latestCommit) => {
        // It is guaranteed that the latest commit contains the SHA hash
        oldStateSha = latestCommit.sha as string
        return okAsync(true)
      })
      .andThen(() =>
        this.getFilePathStats(
          repoName,
          filePath,
          branchName !== STAGING_LITE_BRANCH
        )
      )
      .andThen((stats) => {
        if (!stats.isFile()) {
          return errAsync(
            new GitFileSystemError(
              `Path "${filePath}" is not a valid file in repo "${repoName}"`
            )
          )
        }
        return okAsync(true)
      })
      .andThen(() =>
        this.getGitBlobHash(repoName, filePath, isStaging).andThen((sha) => {
          if (sha !== oldSha) {
            return errAsync(
              new ConflictError(
                "File has been changed recently, please try again"
              )
            )
          }
          return okAsync(sha)
        })
      )
      .andThen(() =>
        ResultAsync.fromPromise(
          fs.promises.writeFile(
            `${efsVolPath}/${repoName}/${filePath}`,
            fileContent,
            "utf-8"
          ),
          (error) => {
            logger.error(`Error when updating ${filePath}: ${error}`)

            if (error instanceof Error) {
              return new GitFileSystemNeedsRollbackError(
                "Unable to update file on disk"
              )
            }

            return new GitFileSystemNeedsRollbackError(
              "An unknown error occurred"
            )
          }
        )
      )
      .andThen(() => {
        const fileName = filePath.split("/").pop()
        return this.commit(
          repoName,
          [filePath],
          userId,
          `Update file: ${fileName}`,
          branchName
        )
      })
      .orElse((error) => {
        if (error instanceof GitFileSystemNeedsRollbackError) {
          return this.rollback(repoName, oldStateSha, branchName).andThen(() =>
            errAsync(new GitFileSystemError(error.message))
          )
        }

        return errAsync(error)
      })
  }

  // Delete a file or directory
  delete(
    repoName: string,
    path: string,
    oldSha: string,
    userId: SessionDataProps["isomerUserId"],
    isDir: boolean,
    branchName: string
  ): ResultAsync<string, GitFileSystemError | NotFoundError> {
    let oldStateSha = ""
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    const isStaging = this.isStagingFromBranchName(branchName)

    return this.getLatestCommitOfBranch(repoName, branchName)
      .andThen((latestCommit) => {
        if (!latestCommit.sha) {
          return errAsync(
            new GitFileSystemError(
              `Unable to find latest commit of repo: ${repoName} on branch "${branchName}"`
            )
          )
        }
        oldStateSha = latestCommit.sha as string
        return okAsync(true)
      })
      .andThen(() =>
        this.getFilePathStats(
          repoName,
          path,
          branchName !== STAGING_LITE_BRANCH
        )
      )
      .andThen((stats) => {
        if (isDir && !stats.isDirectory()) {
          return errAsync(
            new GitFileSystemError(
              `Path "${path}" is not a valid directory in repo "${repoName}"`
            )
          )
        }
        if (!isDir && !stats.isFile()) {
          return errAsync(
            new GitFileSystemError(
              `Path "${path}" is not a valid file in repo "${repoName}"`
            )
          )
        }
        return okAsync(true)
      })
      .andThen(() => {
        if (isDir) {
          return okAsync(true) // If it's a directory, skip the blob hash verification
        }
        return this.getGitBlobHash(repoName, path, isStaging).andThen((sha) => {
          if (sha !== oldSha) {
            return errAsync(
              new ConflictError(
                "File has been changed recently, please try again"
              )
            )
          }
          return okAsync(sha)
        })
      })
      .andThen(() => {
        const deletePromise = isDir
          ? fs.promises.rm(`${efsVolPath}/${repoName}/${path}`, {
              recursive: true,
              force: true,
            })
          : fs.promises.rm(`${efsVolPath}/${repoName}/${path}`)

        return ResultAsync.fromPromise(deletePromise, (error) => {
          logger.error(
            `Error when deleting ${path} from Git file system: ${error}`
          )
          if (error instanceof Error) {
            return new GitFileSystemNeedsRollbackError(
              `Unable to delete ${isDir ? "directory" : "file"} on disk`
            )
          }
          return new GitFileSystemNeedsRollbackError(
            "An unknown error occurred"
          )
        })
      })
      .andThen(() =>
        this.commit(
          repoName,
          [path],
          userId,
          `Delete ${
            isDir ? `directory: ${path}` : `file: ${path.split("/").pop()}`
          }`,
          branchName
        )
      )
      .orElse((error) => {
        if (error instanceof GitFileSystemNeedsRollbackError) {
          return this.rollback(repoName, oldStateSha, branchName).andThen(() =>
            errAsync(new GitFileSystemError(error.message))
          )
        }

        return errAsync(error)
      })
  }

  // Delete multiple files
  deleteMultipleFiles(
    repoName: string,
    items: Array<{ filePath: string; sha: string }>,
    userId: SessionDataProps["isomerUserId"],
    branchName: string
  ): ResultAsync<string, GitFileSystemError | NotFoundError> {
    let oldStateSha = ""
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    const isStaging = this.isStagingFromBranchName(branchName)

    return this.getLatestCommitOfBranch(repoName, branchName)
      .andThen((latestCommit) => {
        if (!latestCommit.sha) {
          return errAsync(
            new GitFileSystemError(
              `Unable to find latest commit of repo: ${repoName} on branch "${branchName}"`
            )
          )
        }
        oldStateSha = latestCommit.sha
        return okAsync(true)
      })
      .andThen(() =>
        ResultAsync.combine(
          items.map(({ filePath, sha }) =>
            this.getFilePathStats(repoName, filePath, isStaging).andThen(
              (stats) =>
                okAsync({
                  filePath,
                  sha,
                  stats,
                })
            )
          )
        )
      )
      .andThen((itemsWithStats) => {
        const isFileConflict = !itemsWithStats.every(async (itemStats) => {
          if (itemStats.stats.isDirectory()) {
            // If it's a directory, skip the blob hash verification
            return true
          }

          const result = await this.getGitBlobHash(
            repoName,
            itemStats.filePath,
            isStaging
          ).andThen((sha) => {
            if (sha !== itemStats.sha) {
              return okAsync(false)
            }

            return okAsync(true)
          })

          return result.isOk() && result.value
        })

        if (isFileConflict) {
          return errAsync(
            new ConflictError(
              "File has been changed recently, please try again"
            )
          )
        }

        return okAsync(itemsWithStats)
      })
      .andThen((itemsWithStats) =>
        // Note: All deletions must be successful, otherwise we rollback
        ResultAsync.combine(
          itemsWithStats.map((itemStats) => {
            const deletePromise = itemStats.stats.isDirectory()
              ? fs.promises.rm(
                  `${efsVolPath}/${repoName}/${itemStats.filePath}`,
                  {
                    recursive: true,
                    force: true,
                  }
                )
              : fs.promises.rm(
                  `${efsVolPath}/${repoName}/${itemStats.filePath}`
                )

            return ResultAsync.fromPromise(deletePromise, (error) => {
              logger.error(
                `Error when deleting ${itemStats.filePath} from Git file system: ${error}`
              )

              if (error instanceof Error) {
                return new GitFileSystemNeedsRollbackError(
                  `Unable to delete ${
                    itemStats.stats.isDirectory() ? "directory" : "file"
                  } on disk`
                )
              }

              return new GitFileSystemNeedsRollbackError(
                "An unknown error occurred"
              )
            })
          })
        )
      )
      .andThen(() =>
        this.commit(
          repoName,
          items.map((item) => item.filePath),
          userId,
          `Delete ${items.length} items`,
          branchName
        )
      )
      .orElse((error) => {
        if (error instanceof GitFileSystemNeedsRollbackError) {
          return this.rollback(repoName, oldStateSha, branchName).andThen(() =>
            errAsync(new GitFileSystemError(error.message))
          )
        }

        return errAsync(error)
      })
  }

  // Rename a single file or directory
  renameSinglePath(
    repoName: string,
    oldPath: string,
    newPath: string,
    userId: string,
    branchName: string,
    message?: string
  ): ResultAsync<string, GitFileSystemError | ConflictError | NotFoundError> {
    let oldStateSha = ""
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    return this.getLatestCommitOfBranch(repoName, branchName)
      .andThen((latestCommit) => {
        // It is guaranteed that the latest commit contains the SHA hash
        oldStateSha = latestCommit.sha as string
        return okAsync(true)
      })
      .andThen(() =>
        this.getFilePathStats(
          repoName,
          oldPath,
          branchName !== STAGING_LITE_BRANCH
        )
      )
      .andThen(() =>
        // We expect to see an error here, since the new path should not exist
        this.getFilePathStats(
          repoName,
          newPath,
          branchName !== STAGING_LITE_BRANCH
        )
          .andThen(() =>
            errAsync(new ConflictError("File path already exists"))
          )
          .map(() => true)
          .orElse((error) => {
            if (error instanceof NotFoundError) {
              return okAsync(true)
            }

            return errAsync(error)
          })
      )
      .andThen(() =>
        ResultAsync.fromPromise(
          this.git
            .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
            .mv(oldPath, newPath),
          (error) => {
            logger.error(`Error when moving ${oldPath} to ${newPath}: ${error}`)

            if (error instanceof GitError) {
              return new GitFileSystemNeedsRollbackError(
                `Unable to rename ${oldPath} to ${newPath}`
              )
            }

            return new GitFileSystemNeedsRollbackError(
              "An unknown error occurred"
            )
          }
        )
      )
      .andThen(() =>
        this.commit(
          repoName,
          [oldPath, newPath],
          userId,
          message || `Renamed ${oldPath} to ${newPath}`,
          branchName,
          true
        )
      )
      .orElse((error) => {
        if (error instanceof GitFileSystemNeedsRollbackError) {
          return this.rollback(repoName, oldStateSha, branchName).andThen(() =>
            errAsync(new GitFileSystemError(error.message))
          )
        }

        return errAsync(error)
      })
  }

  // Move multiple files from oldPath to newPath without renaming them
  moveFiles(
    repoName: string,
    oldPath: string,
    newPath: string,
    userId: string,
    targetFiles: string[],
    branchName: string,
    message?: string
  ): ResultAsync<string, GitFileSystemError | ConflictError | NotFoundError> {
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    let oldStateSha = ""

    return this.getLatestCommitOfBranch(repoName, branchName)
      .andThen((latestCommit) => {
        // It is guaranteed that the latest commit contains the SHA hash
        oldStateSha = latestCommit.sha as string
        return okAsync(true)
      })
      .andThen(() =>
        this.getFilePathStats(
          repoName,
          oldPath,
          branchName !== STAGING_LITE_BRANCH
        )
      )
      .andThen((stats) => {
        if (!stats.isDirectory()) {
          return errAsync(
            new GitFileSystemError(
              `Path "${oldPath}" is not a valid directory in repo "${repoName}"`
            )
          )
        }
        return okAsync(true)
      })
      .andThen(() =>
        // Ensure that the new path exists
        ResultAsync.fromPromise(
          fs.promises.mkdir(`${efsVolPath}/${repoName}/${newPath}`, {
            recursive: true,
          }),
          (error) => {
            logger.error(`Error when creating ${newPath} during move: ${error}`)

            if (error instanceof Error) {
              return new GitFileSystemNeedsRollbackError(
                `Unable to create ${newPath}`
              )
            }

            return new GitFileSystemNeedsRollbackError(
              "An unknown error occurred"
            )
          }
        )
      )
      .andThen(() =>
        ResultAsync.combine(
          targetFiles.map((targetFile) =>
            // We expect to see an error here, since the new path should not exist
            this.getFilePathStats(
              repoName,
              `${newPath}/${targetFile}`,
              branchName !== STAGING_LITE_BRANCH
            )
              .andThen(() =>
                errAsync(new ConflictError("File path already exists"))
              )
              .map(() => true)
              .orElse((error) => {
                if (error instanceof NotFoundError) {
                  return okAsync(true)
                }

                return errAsync(error)
              })
              .andThen(() =>
                ResultAsync.fromPromise(
                  fs.promises.rename(
                    `${efsVolPath}/${repoName}/${oldPath}/${targetFile}`,
                    `${efsVolPath}/${repoName}/${newPath}/${targetFile}`
                  ),
                  (error) => {
                    logger.error(
                      `Error when moving ${targetFile} in ${oldPath} to ${newPath}: ${error}`
                    )

                    if (error instanceof GitError) {
                      return new GitFileSystemNeedsRollbackError(
                        `Unable to move ${targetFile} to ${newPath}`
                      )
                    }

                    return new GitFileSystemNeedsRollbackError(
                      "An unknown error occurred"
                    )
                  }
                )
              )
          )
        )
      )
      .andThen(() =>
        this.commit(
          repoName,
          [oldPath, newPath],
          userId,
          message || `Moved selected files from ${oldPath} to ${newPath}`,
          branchName
        )
      )
      .orElse((error) => {
        if (error instanceof GitFileSystemNeedsRollbackError) {
          return this.rollback(repoName, oldStateSha, branchName).andThen(() =>
            errAsync(new GitFileSystemError(error.message))
          )
        }

        return errAsync(error)
      })
  }

  getLatestCommitOfBranch(
    repoName: string,
    branchName: string
  ): ResultAsync<GitHubCommitData, GitFileSystemError> {
    return this.isLocalBranchPresent(repoName, branchName)
      .andThen((isBranchLocallyPresent) =>
        this.getGitLog(
          repoName,
          isBranchLocallyPresent ? branchName : `origin/${branchName}`
        )
      )
      .andThen((logSummary) => {
        const possibleCommit = logSummary.latest
        if (this.isDefaultLogFields(possibleCommit)) {
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

  updateRepoState(
    repoName: string,
    branchName: string,
    sha: string
  ): ResultAsync<void, GitFileSystemError> {
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    return this.isValidGitRepo(repoName, branchName).andThen((isValid) => {
      if (!isValid) {
        return errAsync(
          new GitFileSystemError(
            `Folder "${repoName}" for EFS vol path: "${efsVolPath}" is not a valid Git repo`
          )
        )
      }

      return this.ensureCorrectBranch(repoName, branchName)
        .andThen(() =>
          ResultAsync.fromPromise(
            this.git
              .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
              .catFile(["-t", sha]),
            (error) => {
              // An error is thrown if the SHA does not exist in the branch
              if (error instanceof GitError) {
                return new BadRequestError("The provided SHA is invalid")
              }

              return new GitFileSystemError("An unknown error occurred")
            }
          )
        )
        .andThen(() =>
          ResultAsync.fromPromise(
            this.git
              .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
              .reset(["--hard", sha]),
            (error) => {
              logger.error(`Error when updating repo state: ${error}`)

              if (error instanceof GitError) {
                return new GitFileSystemError(
                  `Unable to update repo state to commit SHA ${sha}`
                )
              }

              return new GitFileSystemError("An unknown error occurred")
            }
          )
        )
        .andThen(() => this.push(repoName, branchName, true))
        .map(() => undefined)
    })
  }

  /**
   * Creates a new branch `branchName` to track `origin/branchName`, if it doesn't exist yet
   */
  createLocalTrackingBranchIfNotExists(
    repoName: string,
    branchName: string
  ): ResultAsync<boolean, GitFileSystemError> {
    return this.isLocalBranchPresent(repoName, branchName).andThen((exists) => {
      if (exists) {
        return okAsync(true)
      }
      const efsVolPath = this.getEfsVolPathFromBranch(branchName)
      return ResultAsync.fromPromise(
        this.git
          .cwd({ path: `${efsVolPath}/${repoName}`, root: false })
          .branch(["--track", branchName, `origin/${branchName}`]),
        (error) => {
          logger.error(`Error when creating local tracking branch: ${error}`)

          if (error instanceof GitError) {
            return new GitFileSystemError(
              `Unable to create local tracking branch ${branchName}`
            )
          }
          return new GitFileSystemError("An unknown error occurred")
        }
      ).map(() => true)
    })
  }

  removeRepo(
    repoName: string,
    branchName: string
  ): ResultAsync<void, GitFileSystemError> {
    // Defensively check if this is not production env
    const NODE_ENV = config.get("env")
    if (NODE_ENV === "prod") {
      return errAsync(
        new GitFileSystemError("Cannot remove repo in production environment")
      )
    }

    // remove the repo from the EFS volume
    const efsVolPath = this.getEfsVolPathFromBranch(branchName)
    return ResultAsync.fromPromise(
      fs.promises.rm(`${efsVolPath}/${repoName}`, {
        recursive: true,
        force: true,
      }),
      (error) => {
        logger.error(
          `Error when removing ${repoName} from EFS volume: ${error}`
        )

        return new GitFileSystemError(
          `Unable to remove repo from EFS volume: ${error}`
        )
      }
    ).map(() => undefined)
  }
}
