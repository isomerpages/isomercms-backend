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
import {
  CleanOptions,
  GitError,
  SimpleGit,
  DefaultLogFields,
  LogResult,
} from "simple-git"

import { config } from "@config/config"

import logger from "@logger/logger"

import { ConflictError } from "@errors/ConflictError"
import GitFileSystemError from "@errors/GitFileSystemError"
import GitFileSystemNeedsRollbackError from "@errors/GitFileSystemNeedsRollbackError"
import { NotFoundError } from "@errors/NotFoundError"

import { ISOMER_GITHUB_ORG_NAME } from "@constants/constants"

import { SessionDataProps } from "@root/classes"
import { MediaTypeError } from "@root/errors/MediaTypeError"
import { MediaFileOutput } from "@root/types"
import { GitHubCommitData } from "@root/types/commitData"
import type {
  GitCommitResult,
  GitDirectoryItem,
  GitFile,
} from "@root/types/gitfilesystem"
import type { IsomerCommitMessage } from "@root/types/github"
import { ALLOWED_FILE_EXTENSIONS } from "@root/utils/file-upload-utils"

const EFS_VOL_PATH = config.get("aws.efs.volPath")
const BRANCH_REF = config.get("github.branchRef")

export default class GitFileSystemService {
  private readonly git: SimpleGit

  constructor(git: SimpleGit) {
    this.git = git
  }

  hasGitFileLock(repoName: string): ResultAsync<boolean, GitFileSystemError> {
    const gitFileLockPath = ".git/index.lock"
    return this.getFilePathStats(repoName, gitFileLockPath)
      .andThen((stats) => ok(stats.isFile()))
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

  isGitInitialized(repoName: string): ResultAsync<boolean, GitFileSystemError> {
    return ResultAsync.fromPromise(
      this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).checkIsRepo(),
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
    repoName: string
  ): ResultAsync<boolean, GitFileSystemError> {
    const originUrl = `git@github.com:${ISOMER_GITHUB_ORG_NAME}/${repoName}.git`

    return ResultAsync.fromPromise(
      this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).remote(["get-url", "origin"]),
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
  isValidGitRepo(repoName: string): ResultAsync<boolean, GitFileSystemError> {
    return this.getFilePathStats(repoName, "")
      .andThen((stats) => {
        if (!stats.isDirectory()) {
          // Return as an error to prevent further processing
          // The function will eventually return false
          return errAsync(false)
        }
        return okAsync(true)
      })
      .orElse((error) => {
        if (error instanceof NotFoundError) {
          return err(false)
        }
        return err(error)
      })
      .andThen(() => this.isGitInitialized(repoName))
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
        logger.error(`Error when getting current branch: ${error}`)

        if (error instanceof GitError) {
          return new GitFileSystemError("Unable to determine current branch")
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    ).andThen((currentBranch) => {
      if (currentBranch !== BRANCH_REF) {
        return ResultAsync.fromPromise(
          this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).checkout(BRANCH_REF),
          (error) => {
            logger.error(`Error when checking out ${BRANCH_REF}: ${error}`)

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
    filePath: string
  ): ResultAsync<string, GitFileSystemError> {
    return ResultAsync.fromPromise(
      this.git
        .cwd(`${EFS_VOL_PATH}/${repoName}`)
        .revparse([`HEAD:${filePath}`]),
      (error) => {
        logger.error(`Error when getting Git blob hash: ${error}`)

        if (error instanceof GitError) {
          return new GitFileSystemError("Unable to determine Git blob hash")
        }

        return new GitFileSystemError("An unknown error occurred")
      }
    )
  }

  // Get filesystem stats of a file or directory
  getFilePathStats(
    repoName: string,
    filePath: string
  ): ResultAsync<fs.Stats, NotFoundError | GitFileSystemError> {
    return ResultAsync.fromPromise(
      fs.promises.stat(`${EFS_VOL_PATH}/${repoName}/${filePath}`),
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

  // Get the Git log of a particular branch
  getGitLog(
    repoName: string,
    branchName: string
  ): ResultAsync<LogResult<DefaultLogFields>, GitFileSystemError> {
    return ResultAsync.fromPromise(
      this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).log([branchName]),
      (error) => {
        logger.error(
          `Error when getting latest commit of "${branchName}" branch: ${error}`
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
    commitSha: string
  ): ResultAsync<true, GitFileSystemError> {
    logger.warn(`Rolling repo ${repoName} back to ${commitSha}`)
    return ResultAsync.fromPromise(
      this.git
        .cwd(`${EFS_VOL_PATH}/${repoName}`)
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
    const originUrl = `git@github.com:${ISOMER_GITHUB_ORG_NAME}/${repoName}.git`

    return this.getFilePathStats(repoName, "")
      .andThen((stats) => ok(stats.isDirectory()))
      .orElse((error) => {
        if (error instanceof NotFoundError) {
          return ok(false)
        }
        return err(error)
      })
      .andThen((isDirectory) => {
        if (!isDirectory) {
          return ResultAsync.fromPromise(
            this.git
              .clone(originUrl, `${EFS_VOL_PATH}/${repoName}`)
              .cwd(`${EFS_VOL_PATH}/${repoName}`)
              .checkout(BRANCH_REF),
            (error) => {
              logger.error(`Error when cloning ${repoName}: ${error}`)

              if (error instanceof GitError) {
                return new GitFileSystemError("Unable to clone repo")
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
      })
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

            logger.error(`Error when pulling ${repoName}: ${error}`)

            if (error instanceof GitError) {
              return new GitFileSystemError(
                "Unable to pull latest changes of repo"
              )
            }

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
  push(
    repoName: string,
    isForce = false
  ): ResultAsync<string, GitFileSystemError> {
    return this.isValidGitRepo(repoName).andThen((isValid) => {
      if (!isValid) {
        return errAsync(
          new GitFileSystemError(`Folder "${repoName}" is not a valid Git repo`)
        )
      }

      return this.ensureCorrectBranch(repoName)
        .andThen(() =>
          ResultAsync.fromPromise(
            isForce
              ? this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).push(["--force"])
              : this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).push(),
            (error) => {
              logger.error(`Error when pushing ${repoName}: ${error}`)

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
              ? this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).push(["--force"])
              : this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).push(),
            (error) => {
              logger.error(`Error when pushing ${repoName}: ${error}`)

              if (error instanceof GitError) {
                return new GitFileSystemError(
                  "Unable to push latest changes of repo"
                )
              }

              return new GitFileSystemError("An unknown error occurred")
            }
          )
        )
        .map(() => `${EFS_VOL_PATH}/${repoName}`)
    })
  }

  // Commit changes to the local Git repository
  commit(
    repoName: string,
    pathSpec: string[],
    userId: SessionDataProps["isomerUserId"],
    message: string,
    skipGitAdd?: boolean
  ): ResultAsync<string, GitFileSystemError | GitFileSystemNeedsRollbackError> {
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
        .andThen(() => {
          if (skipGitAdd) {
            // This is necessary when we have performed a git mv
            return okAsync(true)
          }

          return ResultAsync.fromPromise(
            this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).add(pathSpec),
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
        })
        .andThen(() =>
          ResultAsync.fromPromise(
            this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).commit(commitMessage),
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
    encoding: "utf-8" | "base64" = "utf-8"
  ): ResultAsync<
    GitCommitResult,
    ConflictError | GitFileSystemError | NotFoundError
  > {
    const filePath = directoryName ? `${directoryName}/${fileName}` : fileName
    const pathToEfsDir = `${EFS_VOL_PATH}/${repoName}/${directoryName}/`
    const pathToEfsFile = `${EFS_VOL_PATH}/${repoName}/${filePath}`
    const encodedContent = content
    let oldStateSha = ""

    return this.getLatestCommitOfBranch(repoName, BRANCH_REF)
      .andThen((latestCommit) => {
        const { sha } = latestCommit
        if (!sha) {
          return errAsync(new GitFileSystemError("An unknown error occurred"))
        }
        oldStateSha = sha
        return okAsync(true)
      })
      .andThen(() => this.getFilePathStats(repoName, directoryName))
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
      .andThen(() => this.getFilePathStats(repoName, filePath))
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
          `Create file: ${filePath}`
        )
      )
      .map((commit) => ({ newSha: commit }))
      .orElse((error) => {
        if (error instanceof GitFileSystemNeedsRollbackError) {
          return this.rollback(repoName, oldStateSha).andThen(() =>
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
    return combine([
      ResultAsync.fromPromise(
        fs.promises.readFile(
          `${EFS_VOL_PATH}/${repoName}/${filePath}`,
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

  getFileExtension(fileName: string): Result<string, MediaTypeError> {
    const parts = fileName.split(".")
    if (parts.length > 1) {
      return ok(parts[parts.length - 1])
    }
    return err(new MediaTypeError("Unable to find file extension")) // No extension found
  }

  getMimeType(fileExtension: string): Result<string, MediaTypeError> {
    if (!ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
      err(new MediaTypeError("Unsupported file extension found"))
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
  ): ResultAsync<MediaFileOutput, GitFileSystemError | MediaTypeError> {
    return this.read(
      siteName,
      `${directoryName}/${fileName}`,
      "base64"
    ).andThen((file: GitFile) => {
      const fileType = "file" as const
      const fileExtResult = this.getFileExtension(fileName)
      if (fileExtResult.isErr()) return errAsync(fileExtResult.error)

      const mimeTypeResult = this.getMimeType(fileExtResult.value)
      if (mimeTypeResult.isErr()) return errAsync(mimeTypeResult.error)

      const dataUrlPrefix = `data:${mimeTypeResult.value};base64`
      return okAsync({
        name: fileName,
        sha: file.sha,
        mediaUrl: `${dataUrlPrefix},${file.content}`,
        mediaPath: `${directoryName}/${fileName}`,
        type: fileType,
      })
    })
  }

  // Read the contents of a directory
  listDirectoryContents(
    repoName: string,
    directoryPath: string
  ): ResultAsync<GitDirectoryItem[], GitFileSystemError | NotFoundError> {
    return this.getFilePathStats(repoName, directoryPath)
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
          fs.promises.readdir(`${EFS_VOL_PATH}/${repoName}/${directoryPath}`, {
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
        const resultAsyncs = directoryContents.map((directoryItem) => {
          const isDirectory = directoryItem.isDirectory()
          const { name } = directoryItem
          const path = directoryPath === "" ? name : `${directoryPath}/${name}`
          const type = isDirectory ? "dir" : "file"

          return this.getGitBlobHash(repoName, path)
            .orElse(() => okAsync(""))
            .andThen((sha) =>
              combine([okAsync(sha), this.getFilePathStats(repoName, path)])
            )
            .andThen((shaAndStats) => {
              const [sha, stats] = shaAndStats as [string, fs.Stats]
              const result: GitDirectoryItem = {
                name,
                type,
                sha,
                path,
                size: type === "dir" ? 0 : stats.size,
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

  // Update the contents of a file
  update(
    repoName: string,
    filePath: string,
    fileContent: string,
    oldSha: string,
    userId: SessionDataProps["isomerUserId"]
  ): ResultAsync<string, GitFileSystemError | NotFoundError | ConflictError> {
    let oldStateSha = ""

    return this.getLatestCommitOfBranch(repoName, BRANCH_REF)
      .andThen((latestCommit) => {
        // It is guaranteed that the latest commit contains the SHA hash
        oldStateSha = latestCommit.sha as string
        return okAsync(true)
      })
      .andThen(() => this.getFilePathStats(repoName, filePath))
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
        this.getGitBlobHash(repoName, filePath).andThen((sha) => {
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
            `${EFS_VOL_PATH}/${repoName}/${filePath}`,
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
          `Update file: ${fileName}`
        )
      })
      .orElse((error) => {
        if (error instanceof GitFileSystemNeedsRollbackError) {
          return this.rollback(repoName, oldStateSha).andThen(() =>
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
    isDir: boolean
  ): ResultAsync<string, GitFileSystemError | NotFoundError> {
    let oldStateSha = ""

    return this.getLatestCommitOfBranch(repoName, BRANCH_REF)
      .andThen((latestCommit) => {
        if (!latestCommit.sha) {
          return errAsync(
            new GitFileSystemError(
              `Unable to find latest commit of repo: ${repoName} on branch "${BRANCH_REF}"`
            )
          )
        }
        oldStateSha = latestCommit.sha as string
        return okAsync(true)
      })
      .andThen(() => this.getFilePathStats(repoName, path))
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
        return this.getGitBlobHash(repoName, path).andThen((sha) => {
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
          ? fs.promises.rm(`${EFS_VOL_PATH}/${repoName}/${path}`, {
              recursive: true,
              force: true,
            })
          : fs.promises.rm(`${EFS_VOL_PATH}/${repoName}/${path}`)

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
          }`
        )
      )
      .orElse((error) => {
        if (error instanceof GitFileSystemNeedsRollbackError) {
          return this.rollback(repoName, oldStateSha).andThen(() =>
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
    message?: string
  ): ResultAsync<string, GitFileSystemError | ConflictError | NotFoundError> {
    let oldStateSha = ""

    return this.getLatestCommitOfBranch(repoName, BRANCH_REF)
      .andThen((latestCommit) => {
        // It is guaranteed that the latest commit contains the SHA hash
        oldStateSha = latestCommit.sha as string
        return okAsync(true)
      })
      .andThen(() => this.getFilePathStats(repoName, oldPath))
      .andThen(() =>
        // We expect to see an error here, since the new path should not exist
        this.getFilePathStats(repoName, newPath)
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
          this.git.cwd(`${EFS_VOL_PATH}/${repoName}`).mv(oldPath, newPath),
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
          true
        )
      )
      .orElse((error) => {
        if (error instanceof GitFileSystemNeedsRollbackError) {
          return this.rollback(repoName, oldStateSha).andThen(() =>
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
    message?: string
  ): ResultAsync<string, GitFileSystemError | ConflictError | NotFoundError> {
    let oldStateSha = ""

    return this.getLatestCommitOfBranch(repoName, BRANCH_REF)
      .andThen((latestCommit) => {
        // It is guaranteed that the latest commit contains the SHA hash
        oldStateSha = latestCommit.sha as string
        return okAsync(true)
      })
      .andThen(() => this.getFilePathStats(repoName, oldPath))
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
          fs.promises.mkdir(`${EFS_VOL_PATH}/${repoName}/${newPath}`, {
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
        combine(
          targetFiles.map((targetFile) =>
            // We expect to see an error here, since the new path should not exist
            this.getFilePathStats(repoName, `${newPath}/${targetFile}`)
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
                    `${EFS_VOL_PATH}/${repoName}/${oldPath}/${targetFile}`,
                    `${EFS_VOL_PATH}/${repoName}/${newPath}/${targetFile}`
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
          message || `Moved selected files from ${oldPath} to ${newPath}`
        )
      )
      .orElse((error) => {
        if (error instanceof GitFileSystemNeedsRollbackError) {
          return this.rollback(repoName, oldStateSha).andThen(() =>
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
    return this.getGitLog(repoName, branchName)
      .orElse(() => this.getGitLog(repoName, `origin/${branchName}`))
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
}
